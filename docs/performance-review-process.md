# Proven Path Performance Review Process

**Scoring framework and Claude Skill preparation guide**  
Implementation reference: October 2026

## Purpose and scope

This guide explains the performance-review features currently implemented in Proven Path. It is a description of the product, not a company policy, legal opinion, or recommendation to use a score as the sole basis for employment decisions. A team adapting this framework should define its own role expectations, review cadence, evidence standards, and decision policies.

## Process at a glance

1. **Choose the employee and review period.** Reviews are associated with an employee and a free-text period label. The interface suggests a month for a manager review and a year-based label for a self-reflection, but the period is not a centrally configured review cycle.
2. **Collect perspectives.** An admin or manager can enter a manager review, send the employee a self-reflection link, and invite peers to submit feedback. These are separate records and should be read as different perspectives.
3. **Review scores and evidence.** The employee profile displays review entries, competency trends, qualitative comments, peer response counts, and recommendations. It does not run a formal calibration or consensus step.
4. **Set goals and development actions.** Manager reviews and self-reflections can capture strengths, areas to improve, and goals. A separate AI development-plan feature can use reviews, check-in feedback, and peer reviews to suggest four to six development skills. That plan is an aid to development, not a score or decision.

Regular feedback/check-in entries (for example, 1:1s, performance check-ins, project debriefs, and career conversations) are a related but separate record type. They capture what went well, areas to improve, action items, and next steps; they do not contribute to the review score.

## The numeric scoring framework

### Five core competencies

Manager reviews and employee self-reflections use these five competencies:

| Competency | What is being rated |
|---|---|
| Technical | Role-relevant technical or craft capability |
| Communication | Communication effectiveness |
| Problem solving | Analysis and resolution of problems |
| Teamwork | Collaboration and contribution to the team |
| Leadership | Leadership and influence appropriate to the role |

The manager form describes the scale as **1 (needs work) to 5 (exceptional)**. The current form does not provide behavioral anchors for scores 2, 3, or 4. Do not invent official meanings for those values. Teams adopting the framework should define observable, role-appropriate anchors before using scores consistently.

### Overall score calculation

Each review's overall score is the arithmetic mean of the available core competency scores:

**Overall = sum of entered core scores ÷ number of entered core scores**

- All five competencies have equal weight.
- A blank competency is omitted from both the sum and the divisor; it is not treated as zero.
- If no core score is present, the overall score is empty.
- The result can be fractional and is displayed to one decimal place in the review list.
- Example: Technical 4, Communication 3, Problem solving 5, Teamwork 4, Leadership blank → `(4 + 3 + 5 + 4) ÷ 4 = 4.0`.

This score is **per review entry**, not a weighted combination of manager, self, and peer feedback. Behavioral scores, written comments, goals, and promotion recommendations do not change the formula.

### Optional behavioral skills

Manager reviews and self-reflections may include optional 1–5 scores for these skills:

- **Project and team management:** personal planning and delivery; track-level planning and delivery; solution-driven and proactive; team leadership.
- **Collaboration:** persuasion and influence; creative thinking; flexibility.
- **Design strategy:** decision making; constraint management.
- **Communication:** verbal and written communication; focused communication; leading group conversations; interpersonal and team communication.

These scores are stored and displayed separately. They are **not included** in the overall score or the core competency averages.

## Peer review scale and interpretation

Peer reviews use a separate categorical scale for nine behaviors. They are not numeric 1–5 ratings and are not included in the core overall score.

| Peer rating | Meaning shown in the form |
|---|---|
| Needs Improvement | Not currently effectively using this skill |
| Meets Expectations | Uses this skill effectively with their team |
| Often Exceeds | Applies a wide range of strategies to challenges |
| Exceptional | Models the way for fellow team members and can mentor |
| N/A | Not applicable |

Peer questions cover:

- **Project and team management:** personal planning and delivery; track-level planning and delivery; solution-driven/proactive behavior; team leadership.
- **Collaboration:** persuasion and influence; cross-functional collaboration.
- **Strategic thinking:** alignment with business goals; customer-centric thinking; data-informed decisions.

Comments for each behavior are optional. The form also asks for overall strengths, areas to improve, and a promotion recommendation of **Yes / No / Unsure**. The profile shows counts by rating for each question and counts of promotion recommendations; it does not compute a peer numeric average.

Peer invitations are sent to named email addresses through tokenized links. The interface describes responses as private/confidential, but the stored response includes the peer's email and authorized managers/admins can inspect individual submissions. Therefore, **do not describe the process as anonymous**. Be transparent with both employees and reviewers about who can see responses.

## What the profile's score views mean

- **Review cards** show each manager or self-review separately, including its period, core scores, calculated overall score, optional behavioral scores, comments, goals, and recommendation.
- **Core competency breakdown** averages each competency across all available review entries. It is not restricted to a single period or review type.
- **Score history** plots available overall scores by period, including separate self and manager entries. The app does not calculate a period-level consensus score or normalize ratings across reviewers.
- **Peer results** are shown as categorical counts and written responses, not as part of the numeric trend.
- **Recommendations** are qualitative/categorical inputs, not derived from the numeric score.

When comparing scores, identify the period and review type first. Do not interpret small changes as statistically meaningful, compare employees in different roles as if scores were normalized, or assume the app has performed calibration.

## Recommended human review practice

These are prudent practices for teams using the app; they are not automated product rules:

1. Agree on the review period and role expectations before collecting ratings.
2. Ask reviewers to use specific, recent examples tied to the competency—not personality labels or hearsay.
3. Separate observed outcomes from interpretation. Note context, scope, dependencies, and opportunities the employee had to demonstrate the skill.
4. Treat self-reflection as perspective and context, not as a competing score to mechanically average with a manager score.
5. Read peer feedback as a pattern of evidence. Consider response count, relationship to the work, and differing opportunities to observe.
6. Discuss strengths, growth areas, and a small number of concrete next-period goals with the employee.
7. Keep promotion or other employment decisions in an accountable human process. A recommendation or arithmetic score is not a decision rule.
8. Follow company policy and applicable law for access, retention, accommodations, and employment decisions.

## Claude Skill adaptation brief

Use this section as the starting specification for a team-specific Claude Skill. Replace bracketed items with the team's approved policy before using it with real employee information.

### Suggested role

> Help managers prepare fair, evidence-based performance-review drafts using the team's approved competency definitions and scoring anchors. Separate facts, interpretations, and recommendations. Do not invent evidence, infer protected or personal characteristics, or make employment decisions.

### Intake the Skill should request

- Employee role, level, and relevant expectations: `[provide approved role rubric]`
- Review period and scope of work
- Evidence/examples for each competency, with dates or context where possible
- Employee self-reflection
- Manager observations and regular check-in notes
- Peer feedback, with the organization's approved privacy/attribution rules
- Approved numeric anchors for each score from 1 to 5, and when to use N/A
- Required output format and any company review/approval steps

If evidence or an approved scoring anchor is missing, the Skill should ask a clarifying question or mark the rating **Not enough evidence**. It should not fabricate a score.

### Scoring behavior to preserve

- Keep the five core competencies distinct.
- Apply equal weights only if the team continues to approve that policy.
- Calculate a numeric overall only from the entered core ratings: sum divided by the count of rated items.
- Never treat missing or N/A as zero.
- Keep optional behavioral ratings separate unless the company explicitly changes its framework.
- Keep peer categories and their response counts separate from the numeric score.
- Do not blend self, manager, and peer perspectives into one score unless the company defines a reviewed, explicit method.
- Treat recommendations as a separate judgment with written rationale, never as a formula derived from a score.

### Suggested output

1. Review period and role context
2. Evidence summary by competency
3. Proposed rating per competency, with the approved anchor and evidence
4. Overall score and transparent calculation, only when sufficient ratings exist
5. Strengths supported by examples
6. Growth areas supported by examples
7. Employee perspective and any differences in interpretation
8. Two or three specific, measurable next-period goals
9. Open questions, evidence gaps, and items requiring human review
10. A clear note that the draft is not a final employment decision

### Safeguards for the Skill

- Use only information supplied for the review and approved work-related records.
- Do not infer disability, health, age, race, religion, gender, family status, or other protected/personal traits.
- Avoid personality diagnoses, unsupported causal claims, and absolute labels such as “always” or “never.”
- Do not convert a low score into a disciplinary or termination recommendation.
- Preserve disagreement and uncertainty; do not smooth conflicting feedback into false consensus.
- Minimize personal data in prompts and outputs, and follow the team's access and retention policies.
- Require a manager to verify every factual claim, rating, calculation, and recommendation before sharing.

## Important implementation limits

- The product does not define a formal annual/quarterly cycle, required completion thresholds, or calibration rules.
- The 1–5 manager/self scale has only endpoint wording in the current review form; teams need their own anchors for the middle values.
- Missing core scores are allowed by the calculation, even when a complete review might be the team's desired practice.
- Core competency chart averages span the review entries currently present; they do not isolate one cycle or normalize review types.
- Peer feedback is categorical, not anonymous, and not part of the overall numeric score.
- The AI development plan is separate from performance scoring and should be reviewed by a human.

**Source note:** Prepared from the current Proven Path implementation. Product behavior can change; verify these rules against the live app before adopting them as company policy or embedding them in an internal Skill.
