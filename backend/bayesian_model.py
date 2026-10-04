"""
Bayesian Network Engine using pgmpy
Implements Directed Acyclic Graph (DAG) construction, parameter estimation,
CPT extraction, and exact Variable Elimination inference.
"""

from typing import Dict, List, Tuple, Any, Optional
import networkx as nx
import pandas as pd

# Handle both newer pgmpy (DiscreteBayesianNetwork) and legacy (BayesianNetwork)
try:
    from pgmpy.models import DiscreteBayesianNetwork as BayesianNetwork
except ImportError:
    try:
        from pgmpy.models import BayesianNetwork
    except ImportError:
        # Fallback for environments with older pgmpy
        from pgmpy.models import BayesianModel as BayesianNetwork

from pgmpy.estimators import BayesianEstimator, MaximumLikelihoodEstimator
from pgmpy.inference import VariableElimination


class MedicalBayesianNetwork:
    def __init__(self):
        self.model: Optional[BayesianNetwork] = None
        self.inference_engine: Optional[VariableElimination] = None
        self.edges: List[Tuple[str, str]] = []
        self.target_variable: Optional[str] = None
        self.node_categories: Dict[str, str] = {}
        self.cpts: Dict[str, Any] = {}
        self.variables: List[str] = []
        self.variable_states: Dict[str, List[str]] = {}

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

        if custom_edges and len(custom_edges) > 0:
            edges = [(u, v) for u, v in custom_edges if u in variables and v in variables]
        else:
            edges = []
            # Categorize variables based on clinical ontology
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

            # 1. Connect Risk Factors to Intermediates and Target
            for rf in risk_factors:
                for inter in intermediates:
                    edges.append((rf, inter))
                edges.append((rf, target_variable))

            # 2. Connect Intermediates to Target Condition
            for inter in intermediates:
                edges.append((inter, target_variable))

            # 3. Connect Target Condition to manifesting Symptoms & Diagnostic Signs
            for sym in symptoms:
                edges.append((target_variable, sym))

            # Fallback if no specific categories matched (connect all as Bayesian Naive / Tree model)
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
            # Break cycles if any
            cycles = list(nx.simple_cycles(G))
            for cycle in cycles:
                if len(cycle) >= 2 and (cycle[-1], cycle[0]) in edges:
                    edges.remove((cycle[-1], cycle[0]))

        self.edges = edges
        return self.edges

    def fit(self, train_df: pd.DataFrame, estimator_type: str = "BayesianEstimator"):
        """
        Fits conditional probability distributions (CPTs) from training data.
        Uses BayesianEstimator with Laplace smoothing by default to prevent zero probabilities.
        """
        if not self.edges:
            raise ValueError("DAG structure must be defined before fitting parameters.")

        self.model = BayesianNetwork(self.edges)

        # Store observed variable states from training data
        for col in self.variables:
            if col in train_df.columns:
                self.variable_states[col] = sorted(train_df[col].astype(str).unique().tolist())

        # Parameter Estimation
        if estimator_type == "BayesianEstimator":
            self.model.fit(
                train_df[self.variables],
                estimator=BayesianEstimator,
                prior_type="BDeu",
                equivalent_sample_size=5,
            )
        else:
            self.model.fit(train_df[self.variables], estimator=MaximumLikelihoodEstimator)

        # Verify probabilistic consistency
        is_valid = self.model.check_model()
        if not is_valid:
            raise ValueError("Bayesian Network parameter validation failed.")

        # Initialize exact Variable Elimination inference engine
        self.inference_engine = VariableElimination(self.model)

        # Cache CPT tables
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

    def infer(self, evidence: Dict[str, str]) -> Dict[str, Any]:
        """
        Runs exact probabilistic inference:
        Calculates posterior probability distribution P(Target | Evidence) using Variable Elimination.
        """
        if self.inference_engine is None or self.target_variable is None:
            raise ValueError("Model is not trained or target variable is unspecified.")

        # Clean evidence to keep only valid model variables and known states
        valid_evidence = {}
        for var, val in evidence.items():
            if var in self.variables and var != self.target_variable:
                val_str = str(val)
                known_states = self.variable_states.get(var, [])
                if val_str in known_states:
                    valid_evidence[var] = val_str

        # Compute Prior Distribution P(Target)
        prior_query = self.inference_engine.query(
            variables=[self.target_variable],
            evidence={},
            joint=False,
            show_progress=False,
        )
        prior_states = prior_query.state_names[self.target_variable]
        prior_probs = {str(k): float(v) for k, v in zip(prior_states, prior_query.values)}

        # Compute Posterior Distribution P(Target | Evidence)
        query_result = self.inference_engine.query(
            variables=[self.target_variable],
            evidence=valid_evidence,
            joint=False,
            show_progress=False,
        )

        target_states = query_result.state_names[self.target_variable]
        posterior_probs = {str(k): float(v) for k, v in zip(target_states, query_result.values)}

        # Most probable explanation (highest posterior state)
        highest_class = max(posterior_probs.items(), key=lambda x: x[1])[0]
        highest_prob = posterior_probs[highest_class]

        # Clinical uncertainty and delta analysis
        probability_deltas = {
            state: posterior_probs.get(state, 0.0) - prior_probs.get(state, 0.0)
            for state in target_states
        }

        return {
            "targetVariable": self.target_variable,
            "evidenceSupplied": valid_evidence,
            "priorProbabilities": prior_probs,
            "posteriorProbabilities": posterior_probs,
            "mostProbableClass": highest_class,
            "confidence": float(highest_prob),
            "deltas": probability_deltas,
            "disclaimer": (
                "Educational Decision-Support Prototype. These probabilistic outputs reflect "
                "dataset-conditioned Bayesian inference, not clinical diagnosis or medical verification."
            ),
        }

    def get_network_graph_data(self) -> Dict[str, Any]:
        """Returns nodes and directed edges formatted for frontend graph visualizers."""
        nodes = []
        for var in self.variables:
            parents = list(self.model.get_parents(var)) if self.model else []
            children = list(self.model.get_children(var)) if self.model else []
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
