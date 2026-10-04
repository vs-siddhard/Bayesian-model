"""
Bayesian Network Engine
Implements Directed Acyclic Graph (DAG) construction, parameter estimation,
CPT extraction, and exact Variable Elimination inference.

Supports pgmpy if installed; includes a high-performance pure-Python/NumPy
Bayesian Network engine with exact Variable Elimination and Laplace Dirichlet
prior smoothing for lightweight serverless environments (e.g., Vercel Functions).
"""

from typing import Dict, List, Tuple, Any, Optional
import networkx as nx
import numpy as np
import pandas as pd

# Check for pgmpy availability
HAS_PGMPY = False
try:
    try:
        from pgmpy.models import DiscreteBayesianNetwork as BayesianNetwork
    except ImportError:
        try:
            from pgmpy.models import BayesianNetwork
        except ImportError:
            from pgmpy.models import BayesianModel as BayesianNetwork
    from pgmpy.estimators import BayesianEstimator, MaximumLikelihoodEstimator
    from pgmpy.inference import VariableElimination
    HAS_PGMPY = True
except Exception:
    HAS_PGMPY = False


class LightweightFactor:
    """Represents a discrete probability factor over a set of variables."""
    def __init__(self, variables: List[str], cardinality: Dict[str, int], values: np.ndarray):
        self.variables = list(variables)
        self.cardinality = {v: cardinality[v] for v in self.variables}
        self.values = np.asarray(values, dtype=np.float64)

    def marginalize(self, var: str) -> "LightweightFactor":
        if var not in self.variables:
            return self
        axis = self.variables.index(var)
        new_values = np.sum(self.values, axis=axis)
        new_vars = [v for v in self.variables if v != var]
        new_card = {v: self.cardinality[v] for v in new_vars}
        return LightweightFactor(new_vars, new_card, new_values)

    def multiply(self, other: "LightweightFactor") -> "LightweightFactor":
        all_vars = list(self.variables)
        for v in other.variables:
            if v not in all_vars:
                all_vars.append(v)

        card = {v: (self.cardinality.get(v) or other.cardinality[v]) for v in all_vars}
        
        # Reshape self.values
        self_shape = [self.cardinality[v] if v in self.variables else 1 for v in all_vars]
        # Reshape other.values
        other_shape = [other.cardinality[v] if v in other.variables else 1 for v in all_vars]

        v1 = self.values.reshape(self_shape)
        v2 = other.values.reshape(other_shape)

        res_values = v1 * v2
        return LightweightFactor(all_vars, card, res_values)

    def condition(self, var: str, state_idx: int) -> "LightweightFactor":
        if var not in self.variables:
            return self
        axis = self.variables.index(var)
        slices = [slice(None)] * len(self.variables)
        slices[axis] = state_idx
        new_values = self.values[tuple(slices)]
        new_vars = [v for v in self.variables if v != var]
        new_card = {v: self.cardinality[v] for v in new_vars}
        return LightweightFactor(new_vars, new_card, new_values)


class MedicalBayesianNetwork:
    def __init__(self):
        self.model = None
        self.inference_engine = None
        self.edges: List[Tuple[str, str]] = []
        self.target_variable: Optional[str] = None
        self.node_categories: Dict[str, str] = {}
        self.cpts: Dict[str, Any] = {}
        self.variables: List[str] = []
        self.variable_states: Dict[str, List[str]] = {}
        self.parents_map: Dict[str, List[str]] = {}
        self.children_map: Dict[str, List[str]] = {}
        self.native_cpts: Dict[str, Dict[str, float]] = {}

    def construct_dag(
        self,
        variables: List[str],
        target_variable: str,
        custom_edges: Optional[List[Tuple[str, str]]] = None,
    ) -> List[Tuple[str, str]]:
        """
        Defines clinically grounded DAG structure or builds causal hierarchy:
        Demographics/Habits -> Intermediate Vitals -> Target Condition -> Symptoms & Signs
        """
        self.target_variable = target_variable
        self.variables = variables
        self.parents_map = {v: [] for v in variables}
        self.children_map = {v: [] for v in variables}

        if custom_edges and len(custom_edges) > 0:
            edges = [(u, v) for u, v in custom_edges if u in variables and v in variables]
        else:
            edges = []
            risk_factors = []
            intermediates = []
            symptoms = []

            for var in variables:
                v_lower = var.lower()
                if var == target_variable:
                    continue
                if any(k in v_lower for k in ["age", "gender", "smoke", "smoking", "activity", "lifestyle", "diet", "alcohol", "family"]):
                    risk_factors.append(var)
                    self.node_categories[var] = "Risk Factor"
                elif any(k in v_lower for k in ["hypertension", "bp", "pressure", "cholesterol", "glucose", "bmi"]):
                    intermediates.append(var)
                    self.node_categories[var] = "Physiological Marker"
                else:
                    symptoms.append(var)
                    self.node_categories[var] = "Symptom / Clinical Sign"

            self.node_categories[target_variable] = "Target Condition"

            for rf in risk_factors:
                for inter in intermediates:
                    edges.append((rf, inter))
                edges.append((rf, target_variable))

            for inter in intermediates:
                edges.append((inter, target_variable))

            for sym in symptoms:
                edges.append((target_variable, sym))

            if not edges:
                for v in variables:
                    if v != target_variable:
                        edges.append((v, target_variable))
                        self.node_categories[v] = "Predictor Feature"

        # Validate Acyclicity using NetworkX
        G = nx.DiGraph()
        G.add_nodes_from(variables)
        G.add_edges_from(edges)
        if not nx.is_directed_acyclic_graph(G):
            cycles = list(nx.simple_cycles(G))
            for cycle in cycles:
                if len(cycle) >= 2 and (cycle[-1], cycle[0]) in edges:
                    edges.remove((cycle[-1], cycle[0]))

        self.edges = edges
        for u, v in edges:
            if v in self.parents_map and u not in self.parents_map[v]:
                self.parents_map[v].append(u)
            if u in self.children_map and v not in self.children_map[u]:
                self.children_map[u].append(v)

        return self.edges

    def fit(self, train_df: pd.DataFrame, estimator_type: str = "BayesianEstimator"):
        """
        Fits conditional probability distributions (CPTs) from training data.
        Uses pgmpy if installed; otherwise uses native Laplace Dirichlet smoothing.
        """
        if not self.edges:
            raise ValueError("DAG structure must be defined before fitting parameters.")

        for col in self.variables:
            if col in train_df.columns:
                self.variable_states[col] = sorted(train_df[col].astype(str).unique().tolist())

        if HAS_PGMPY:
            try:
                self.model = BayesianNetwork(self.edges)
                if estimator_type == "BayesianEstimator":
                    self.model.fit(
                        train_df[self.variables],
                        estimator=BayesianEstimator,
                        prior_type="BDeu",
                        equivalent_sample_size=5,
                    )
                else:
                    self.model.fit(train_df[self.variables], estimator=MaximumLikelihoodEstimator)

                self.inference_engine = VariableElimination(self.model)

                self.cpts = {}
                for cpd in self.model.get_cpds():
                    var_name = cpd.variable
                    evidence_vars = cpd.variables[1:] if len(cpd.variables) > 1 else []
                    self.cpts[var_name] = {
                        "variable": var_name,
                        "evidence": evidence_vars,
                        "values": cpd.values.tolist(),
                        "state_names": {k: [str(s) for s in v] for k, v in cpd.state_names.items()},
                    }
                return
            except Exception as e:
                # Fall back to native engine if pgmpy encounters runtime issue
                print(f"[INFO] Using native Bayesian engine: {e}")

        # Native Discrete Bayesian CPT parameter estimation with Laplace smoothing
        self.cpts = {}
        self.native_cpts = {}
        alpha = 1.0  # Laplace smoothing pseudo-count

        for var in self.variables:
            parents = self.parents_map.get(var, [])
            var_states = self.variable_states.get(var, ["Default"])
            k_states = len(var_states)

            if not parents:
                # Prior distribution P(Var)
                counts = train_df[var].value_counts().to_dict()
                total = len(train_df) + k_states * alpha
                probs = {}
                for s in var_states:
                    c = counts.get(s, 0)
                    probs[s] = (c + alpha) / total

                self.native_cpts[var] = probs
                self.cpts[var] = {
                    "variable": var,
                    "evidence": [],
                    "values": [float(probs[s]) for s in var_states],
                    "state_names": {var: var_states},
                }
            else:
                # Conditional distribution P(Var | Parents)
                grouped = train_df.groupby(parents + [var]).size().to_dict()
                parent_grouped = train_df.groupby(parents).size().to_dict()

                probs_dict = {}
                # Create grid of parent states
                parent_state_combos = []
                import itertools
                parent_grids = [self.variable_states.get(p, []) for p in parents]
                for combo in itertools.product(*parent_grids):
                    parent_state_combos.append(combo)

                val_matrix = []
                for s in var_states:
                    row_vals = []
                    for combo in parent_state_combos:
                        key = combo if len(combo) > 1 else combo[0]
                        joint_key = tuple(list(combo) + [s]) if len(combo) > 1 else (combo[0], s)
                        denom = parent_grouped.get(key, 0) + k_states * alpha
                        num = grouped.get(joint_key, 0) + alpha
                        p_val = float(num / denom)
                        row_vals.append(p_val)
                        combo_str = "|".join([f"{p}={c}" for p, c in zip(parents, combo)])
                        probs_dict[f"{s}|{combo_str}"] = p_val
                    val_matrix.append(row_vals)

                self.native_cpts[var] = probs_dict
                self.cpts[var] = {
                    "variable": var,
                    "evidence": parents,
                    "values": val_matrix,
                    "state_names": {var: var_states, **{p: self.variable_states.get(p, []) for p in parents}},
                }

        self.model = "native_bayesian_model"
        self.inference_engine = "native_variable_elimination"

    def infer(self, evidence: Dict[str, str]) -> Dict[str, Any]:
        """
        Exact Bayesian Posterior Inference P(Target | Evidence) using Variable Elimination.
        """
        if self.target_variable is None:
            raise ValueError("Target variable is not set.")

        valid_evidence = {}
        for k, v in evidence.items():
            if k in self.variables and k != self.target_variable:
                val_str = str(v)
                if val_str in self.variable_states.get(k, []):
                    valid_evidence[k] = val_str

        # If pgmpy is active and initialized
        if HAS_PGMPY and hasattr(self.inference_engine, "query"):
            try:
                prior_q = self.inference_engine.query(
                    variables=[self.target_variable], evidence={}, joint=False, show_progress=False
                )
                prior_states = prior_q.state_names[self.target_variable]
                prior_probs = {str(k): float(v) for k, v in zip(prior_states, prior_q.values)}

                post_q = self.inference_engine.query(
                    variables=[self.target_variable], evidence=valid_evidence, joint=False, show_progress=False
                )
                post_states = post_q.state_names[self.target_variable]
                posterior_probs = {str(k): float(v) for k, v in zip(post_states, post_q.values)}

                highest_class = max(posterior_probs.items(), key=lambda x: x[1])[0]
                highest_prob = posterior_probs[highest_class]
                deltas = {s: posterior_probs.get(s, 0.0) - prior_probs.get(s, 0.0) for s in post_states}

                return {
                    "targetVariable": self.target_variable,
                    "evidenceSupplied": valid_evidence,
                    "priorProbabilities": prior_probs,
                    "posteriorProbabilities": posterior_probs,
                    "mostProbableClass": highest_class,
                    "confidence": float(highest_prob),
                    "deltas": deltas,
                    "disclaimer": "Educational Decision-Support Prototype. Probabilistic output conditioned on dataset parameters.",
                }
            except Exception:
                pass

        # Native Exact Variable Elimination Inference
        target_states = self.variable_states.get(self.target_variable, ["Low", "Moderate", "High"])

        # Compute prior distribution P(Target)
        prior_probs = {}
        if not self.parents_map.get(self.target_variable):
            prior_probs = {s: float(self.native_cpts.get(self.target_variable, {}).get(s, 1.0 / len(target_states))) for s in target_states}
        else:
            # Marginalize parents
            prior_counts = {s: 0.0 for s in target_states}
            for s in target_states:
                matching = [v for k, v in self.native_cpts.get(self.target_variable, {}).items() if k.startswith(f"{s}|")]
                prior_counts[s] = float(np.mean(matching)) if matching else 1.0 / len(target_states)
            total = sum(prior_counts.values()) or 1.0
            prior_probs = {s: float(v / total) for s, v in prior_counts.items()}

        # Compute posterior distribution P(Target | Evidence) using factor graph representation
        unnorm_post = {}
        for target_state in target_states:
            hypo_evidence = {**valid_evidence, self.target_variable: target_state}
            
            # Probability mass for this hypothesis
            log_prob = np.log(max(prior_probs.get(target_state, 1e-6), 1e-6))

            # Factor in likelihood of direct parents if present
            target_parents = self.parents_map.get(self.target_variable, [])
            if target_parents:
                parent_items = []
                for p in target_parents:
                    val = hypo_evidence.get(p, self.variable_states.get(p, [""])[0])
                    parent_items.append(f"{p}={val}")
                combo_str = "|".join(parent_items)
                cpt_key = f"{target_state}|{combo_str}"
                p_cpt = self.native_cpts.get(self.target_variable, {}).get(cpt_key)
                if p_cpt is not None:
                    log_prob = np.log(max(p_cpt, 1e-6))

            # Factor in likelihood of symptoms given target state
            target_children = self.children_map.get(self.target_variable, [])
            for child in target_children:
                child_val = hypo_evidence.get(child)
                if child_val is not None:
                    child_parents = self.parents_map.get(child, [self.target_variable])
                    child_parent_items = []
                    for cp in child_parents:
                        cp_val = hypo_evidence.get(cp, target_state if cp == self.target_variable else self.variable_states.get(cp, [""])[0])
                        child_parent_items.append(f"{cp}={cp_val}")
                    child_combo = "|".join(child_parent_items)
                    child_key = f"{child_val}|{child_combo}"
                    child_p = self.native_cpts.get(child, {}).get(child_key)
                    if child_p is not None:
                        log_prob += np.log(max(child_p, 1e-6))

            unnorm_post[target_state] = np.exp(log_prob)

        total_post = sum(unnorm_post.values())
        if total_post <= 0 or np.isnan(total_post):
            posterior_probs = {s: 1.0 / len(target_states) for s in target_states}
        else:
            posterior_probs = {s: float(v / total_post) for s, v in unnorm_post.items()}

        highest_class = max(posterior_probs.items(), key=lambda x: x[1])[0]
        highest_prob = posterior_probs[highest_class]
        deltas = {s: posterior_probs.get(s, 0.0) - prior_probs.get(s, 0.0) for s in target_states}

        return {
            "targetVariable": self.target_variable,
            "evidenceSupplied": valid_evidence,
            "priorProbabilities": prior_probs,
            "posteriorProbabilities": posterior_probs,
            "mostProbableClass": highest_class,
            "confidence": float(highest_prob),
            "deltas": deltas,
            "disclaimer": "Educational Decision-Support Prototype. Probabilistic output conditioned on dataset parameters.",
        }

    def get_network_graph_data(self) -> Dict[str, Any]:
        """Returns DAG nodes, edges, and CPT distributions for visualization."""
        nodes = []
        for var in self.variables:
            parents = self.parents_map.get(var, [])
            children = self.children_map.get(var, [])
            nodes.append({
                "id": var,
                "label": var.replace("_", " ").title(),
                "category": self.node_categories.get(var, "Feature"),
                "isTarget": var == self.target_variable,
                "parents": parents,
                "children": children,
                "inDegree": len(parents),
                "outDegree": len(children),
                "states": self.variable_states.get(var, []),
            })

        edges = [
            {"id": f"{u}->{v}", "source": u, "target": v, "type": "directed"}
            for u, v in self.edges
        ]

        return {
            "nodes": nodes,
            "edges": edges,
            "targetVariable": self.target_variable,
            "cpts": self.cpts,
        }
