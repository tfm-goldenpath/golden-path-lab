# Propose a use case

[Guide index](README.md) · [Español](../ES/use-case-intake.md)

**[Open the use-case form](https://github.com/tfm-goldenpath/golden-path-lab/issues/new?template=use-case.yml)**
to suggest a service, delivery integration, security or quality check, test scenario or
documentation improvement. You do not need to understand the repository's internals.
English or Spanish answers are welcome. Search [existing requests](https://github.com/tfm-goldenpath/golden-path-lab/issues)
first; a related issue may already describe your need.

Requests are public. Omit secrets, personal/customer data and private evidence;
confidential vulnerability reports do not belong in this form.

## What to include

The first three fields are required; the last two are optional.

- **Request category:** choose the closest option, including “Unsure or general
  request” if needed. “Security or quality check” covers a delivery check;
  “Test scenario” means adding a controlled test of behavior.
- **What would you like to do, and what gets in your way?** Explain your need,
  the current difficulty and a short example.
- **What would success look like?** Describe something another person could check,
  such as finding the right command and following its prerequisites.
- **Where would you use this?** Include relevant tools, local/cloud setup and limits
  such as memory or network access. Unknown details are fine.
- **Examples, links or implementation ideas:** add useful public references or a
  possible approach, if you have one. A technical design is unnecessary.

For security or quality checks, describe allowed input, rejected input and an
unavailable check; an unavailable check is an error, not successful detection.

## Two examples

These are **proposed capabilities, not implemented features**.

**Java service trial.** A Java developer wants to try delivery with a small Maven
service but has no suitable starter. Success would mean following a short guide
to build it, deploy it and confirm the expected image is running. This depends on
future consumer-template support: a starter for projects using the delivery tools.
Which Java build tools should the trial cover?

**Vulnerability reassessment before redeployment.** An operator wants to check an
existing image again because vulnerability information may have changed. Success
would mean a report tied to the exact image, with an allowed result, a blocking
finding or an unavailable scan clearly distinguished. The report would identify
when the scan ran and which vulnerability database it used. How recent must that
scan be?

## What happens next

Maintainers will assess the request and may ask for more information. Submission
does not guarantee implementation.

1. **Clarify the request:** check for duplicates and fill important gaps.
2. **Assess feasibility:** consider compatibility, tests and resource cost using
   the [roadmap](../../implementation/TODO.md) and [control guide](how-it-works.md).
3. **Record the decision:** **needs information** asks for missing details;
   **candidate** means worth planning; **deferred** means revisit later;
   **declined** means not proceeding, with a reason.

Selected work gets a separate implementation PR and validation plan. These are
planning decisions, not automated issue labels.
