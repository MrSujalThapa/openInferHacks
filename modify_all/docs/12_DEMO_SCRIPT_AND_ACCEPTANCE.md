# 12 — Demo Script and Acceptance

## 20-second opening

“Everyone uses the same websites every day, but the layout is controlled by the company, not the user. Genie turns any webpage into a personal sandbox. You lasso a section, move or resize it like Figma, and if you double-click that exact group, a contextual AI agent appears to edit only that section. OpenInfer powers the agent and MongoDB remembers the personalized layout.”

## Main demo flow

1. Open LinkedIn or fallback LinkedIn-style page.
2. Click Genie extension → Enter Edit Mode.
3. Hover shows Figma-style section outlines.
4. Freeform lasso the right news/sidebar section.
5. Group appears with blue bounding box and size label.
6. Drag it lower.
7. Resize it smaller.
8. Double-click grouped section.
9. Genie appears beside that group only.
10. Type: “Make this compact dark mode and less distracting.”
11. Show loading: “Thinking with OpenInfer...”
12. Patch previews on the selected group.
13. Click Save.
14. Refresh page.
15. Customization persists.
16. Open debug trace/MongoDB view showing saved customization and agent trace.

## What to emphasize

- “No global chatbot.”
- “The agent only appears when a grouped section is double-clicked.”
- “The agent is precision-scoped to this group.”
- “OpenInfer is used for section understanding, intent interpretation, patch planning, and critique.”
- “MongoDB stores groups, patches, memory, and agent traces.”

## Acceptance checklist

### Core interaction

- [ ] Edit mode toggles on/off.
- [ ] Hover outlines work.
- [ ] Freeform lasso works.
- [ ] Group bounding box appears.
- [ ] Drag works.
- [ ] Resize works.
- [ ] Agent appears only on double-clicked group.

### Agent

- [ ] Agent request includes selected group.
- [ ] OpenInfer returns structured patch.
- [ ] Patch is validated.
- [ ] Patch previews correctly.
- [ ] Agent run is logged to MongoDB.

### Persistence

- [ ] Save writes customization to MongoDB.
- [ ] Refresh reloads customization.
- [ ] Target resolves on demo page.

### Polish

- [ ] UI looks premium.
- [ ] Loading and save states are clear.
- [ ] Fallback page is ready.
- [ ] Demo can be completed in under 3 minutes.

## Fallback lines

If LinkedIn breaks:

“Live websites can rerender aggressively, so for a clean demo we are showing the same generic DOM engine on a LinkedIn-style page. The extension logic is not hardcoded to this page.”

If OpenInfer is slow:

“The agent trace shows the OpenInfer workflow. For demo timing, we cache the last safe patch response after the first call.”
