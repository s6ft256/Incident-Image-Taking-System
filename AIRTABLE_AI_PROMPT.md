# Airtable AI Prompt – Store All App Data

Paste the prompt below into Airtable's AI base builder (**Create base → Build an app with AI**, or Omni in an existing base).
It mirrors the field names the app writes in [services/airtableService.ts](services/airtableService.ts). Names are case-sensitive and must match exactly.

---

```text
Create an Airtable base called "Incident System" that stores ALL data submitted by an HSE (health, safety & environment) reporting app. Create exactly the 5 tables below, with the exact table names and exact field names (case-sensitive, including spaces and the "/" characters). The first field of each table is its primary field. Do not add extra required fields, and do not rename anything.

TABLE 1: "Observation Reports"
- Name (Single line text) – primary field, reporter name
- Role / Position (Single line text)
- Site / Location (Single line text)
- Observation Type (Single select: Unsafe Act, Unsafe Condition, Near Miss, Positive Observation, Suggestion)
- Observation (Long text)
- Action Taken (Long text)
- Assigned To (Single line text)
- Location (Single line text) – GPS coordinates
- Root Cause (Single line text)
- Open observations (Attachment) – initial evidence photos
- Closed observations (Attachment) – closure / fix photos
- Attachments (Attachment) – legacy
- Closed By (Single line text)
- Status (Formula): IF({Action Taken}="", "Open", "Closed")
- Created (Created time)

TABLE 2: "Incident Reports"
- Title (Single line text) – primary field
- Description (Long text)
- Incident Date (Date, include time, UTC)
- Category (Single select: Safety, Environmental, Security, Health, Quality, Asset Damage)
- Severity (Number, integer 1-5)
- Likelihood (Number, integer 1-5)
- Status (Single select: Pending Review, Action Pending, Verification Pending, Closed)
- Location (Single line text) – GPS coordinates
- Site / Project (Single select, allow adding new options)
- Department (Single select, allow adding new options)
- Reporter ID (Single line text)
- Device Metadata (Long text)
- Persons Involved (Long text)
- Equipment Involved (Long text)
- Witnesses (Long text)
- Root Cause (Long text)
- Recommended Controls (Long text)
- Reviewer (Single line text)
- Review Date (Date)
- Review Comments (Long text)
- Action Assigned To (Single line text)
- Action Due Date (Date)
- Corrective Action (Long text)
- Verification Comments (Long text)
- Verification Photos (Attachment)
- Attachments (Attachment) – initial evidence
- Closed By (Single line text)
- Closure Date (Date)
- ID (Formula): RECORD_ID()
- Risk Score (Formula): {Severity} * {Likelihood}
- Created (Created time)

TABLE 3: "Crane Checklists"
- Plant Number (Single line text) – primary field
- Inspection Date (Date)
- Inspector Name (Single line text)
- Crane Type (Single line text)
- Make and Model (Single line text)
- Status (Single select: Operational, Grounded)
- Critical Failures (Long text)
- Inspection Data (Long text) – JSON of {checks, remarks}
- Image (Attachment)
- Created (Created time)

TABLE 4: "Equipment Checklists"
- Plant Number (Single line text) – primary field
- Inspection Date (Date)
- Inspector Name (Single line text)
- Equipment Type (Single line text)
- Make and Model (Single line text)
- Status (Single select: Operational, Grounded)
- Critical Failures (Long text)
- Inspection Data (Long text) – JSON of {checks, remarks}
- Image (Attachment)
- Created (Created time)

TABLE 5: "Training Roster"
- Project Name (Single line text) – primary field
- Location (Single line text)
- Contractor (Single line text)
- Topic Discussed (Single line text)
- Conducted By (Single line text)
- Trainees Count (Number, integer)
- Attachments (Attachment) – sign-in sheets / photos
- Created (Created time)

Also create these views:
- Observation Reports: "Open" (filter Status = Open), "Closed" (filter Status = Closed)
- Incident Reports: one Kanban view grouped by Status; a grid view "High Risk" filtered Risk Score >= 15
- Crane Checklists and Equipment Checklists: "Grounded" (filter Status = Grounded)

Do not create sample records. Do not link tables to each other.
```

---

## After the base is created

1. Copy the Base ID (`app…`) from the URL.
2. Create a Personal Access Token at https://airtable.com/create/tokens with scopes `data.records:read` and `data.records:write`, restricted to this base.
3. Set `VITE_AIRTABLE_BASE_ID` and `VITE_AIRTABLE_API_KEY` in `.env.local` (and in your hosting provider's environment settings), then restart `npm run dev`.
4. If the "Incident Reports" table has a different ID than the one in [constants.ts](constants.ts) (`TABLES.INCIDENTS`), replace it with the new table ID or with `'Incident Reports'`.

Notes:
- The app submits with `typecast: true`, so single-select options not listed above are created automatically.
- Attachment fields require publicly reachable URLs; Airtable downloads the files from the URLs the app sends.
