// §13 seed misconception taxonomy for the ENG1001 pilot topic (ODEs/calculus).

export interface TaxonomyEntry {
  key: string;
  name: string;
  description: string;
  severity: "notational" | "procedural" | "conceptual";
  typical_signature: string;
  remediation_note: string;
}

export const MISCONCEPTION_TAXONOMY: TaxonomyEntry[] = [
  {
    key: "mc_product_rule_distributive",
    name: "Product rule treated as distributive",
    description: "Treats d/dx(uv) as if it distributes like multiplication over addition.",
    severity: "conceptual",
    typical_signature: "d/dx(uv) = u'v'",
    remediation_note: "Concrete counterexample, then 3 product drills",
  },
  {
    key: "mc_usub_limits_untransformed",
    name: "Limits not transformed after substitution",
    description: "Evaluates a definite integral in the new variable using the original limits.",
    severity: "procedural",
    typical_signature: "evaluates in u using original x limits",
    remediation_note: "Limit-transformation checklist",
  },
  {
    key: "mc_constant_of_integration_dropped",
    name: "Omits +C",
    description: "Drops the arbitrary constant of integration.",
    severity: "notational",
    typical_signature: "missing +C",
    remediation_note: "One-line correction, no practice",
  },
  {
    key: "mc_chain_rule_missing_inner",
    name: "Inner derivative omitted",
    description: "Applies the chain rule without multiplying by the derivative of the inner function.",
    severity: "procedural",
    typical_signature: "d/dx sin(3x) = cos(3x)",
    remediation_note: "Decomposition drills",
  },
  {
    key: "mc_ic_applied_before_general",
    name: "IC applied to a particular, not general, solution",
    description: "Applies the initial condition mid-derivation instead of to the general solution.",
    severity: "conceptual",
    typical_signature: "applies IC mid-derivation",
    remediation_note: "Order-of-operations walkthrough",
  },
  {
    key: "mc_ibp_sign_error",
    name: "Sign error in integration by parts",
    description: "Drops or flips a sign in the integration-by-parts formula.",
    severity: "procedural",
    typical_signature: "∫u dv = uv + ∫v du",
    remediation_note: "Formula recall + 2 drills",
  },
  {
    key: "mc_domain_ignored",
    name: "Ignores domain restrictions",
    description: "Divides by an expression that may be zero, without a case split.",
    severity: "conceptual",
    typical_signature: "divides by a possibly-zero expression",
    remediation_note: "Case-split exercises",
  },
  {
    key: "mc_notation_equals_chain",
    name: "Chains non-equal expressions with =",
    description: "Uses '=' to mean 'next step' rather than mathematical equality.",
    severity: "notational",
    typical_signature: "'=' used to mean 'next step'",
    remediation_note: "Notation hygiene note",
  },
  {
    key: "mc_separation_invalid",
    name: "Separates a non-separable ODE",
    description: "Attempts separation of variables on an equation that doesn't factor into that form.",
    severity: "conceptual",
    typical_signature: "separates when terms don't factor",
    remediation_note: "Recognition drills",
  },
  {
    key: "mc_linearity_over_nonlinear",
    name: "Applies linearity to non-linear operators",
    description: "Distributes a non-linear operator (e.g. square root) over a sum.",
    severity: "conceptual",
    typical_signature: "√(a+b) = √a + √b",
    remediation_note: "Counterexample + drills",
  },
  {
    key: "mc_arbitrary_constant_merged",
    name: "Merges constants prematurely",
    description: "Combines constants of integration in a way that loses generality.",
    severity: "notational",
    typical_signature: "loses generality of C",
    remediation_note: "Brief note",
  },
  {
    key: "mc_partial_fraction_form",
    name: "Wrong partial-fraction ansatz",
    description: "Assumes a partial-fraction decomposition with the wrong numerator degree.",
    severity: "procedural",
    typical_signature: "wrong numerator degree",
    remediation_note: "Form-selection table",
  },
];
