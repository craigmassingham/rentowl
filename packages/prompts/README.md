# @rentowl/prompts

All Claude prompts, versioned. See ARCHITECTURE.md §4 for the structure and pattern.

First prompt lands in ticket M1-W3-02 (tenancy agreement generation). Every prompt:

- exports a typed function with Zod-validated input and output
- has an accompanying `.eval.ts` file with at least 5 test cases
- keeps its system prompt in a sibling `.system.md` file
- logs prompt version, model, input hash, output, and cost
