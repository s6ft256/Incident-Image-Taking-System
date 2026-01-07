# Airtable Database Setup Guide

To reset your system or start fresh, follow these steps to create a new Airtable Base compatible with this application.

## 1. Create a New Base
1. Log in to [airtable.com](https://airtable.com/).
2. Click **Create base** (Start from scratch).
3. Name it "Incident System" (or similar).

## 2. Create Tables & Fields
You need to create exactly these tables and columns (case-sensitive).

### Table 1: `Observation Reports`
| Field Name | Type | Notes |
|------------|------|-------|
| Name | Single line text | Reporter name |
| Role / Position | Single line text | |
| Site / Location | Single line text | |
| Observation Type | Single Select | Options: `Unsafe Act`, `Unsafe Condition`, `Near Miss`, `Positive Observation`, `Suggestion` |
| Observation | Long text | The main description |
| Action Taken | Long text | Initial fix |
| Assigned To | Single line text | |
| Location | Single line text | GPS Coordinates |
| Root Cause | Single line text | |
| Attachments | Attachment | (Legacy field) |
| Open observations | Attachment | **Crucial**: Stores initial evidence images |
| Closed observations | Attachment | **Crucial**: Stores closure/fix images |
| Closed By | Single line text | |
| Status | Formula | Formula: `IF({Action Taken}="", "Open", "Closed")` |

### Table 2: `Incident Reports`
*Note: Rename the default "Table 1" to "Incident Reports"*

| Field Name | Type | Options / Notes |
|------------|------|-----------------|
| ID | Formula | `RECORD_ID()` |
| Title | Single line text | |
| Description | Long text | |
| Incident Date | Date | Include time |
| Category | Single Select | `Safety`, `Environmental`, `Security`, `Health`, `Quality`, `Asset Damage` |
| Severity | Number | Integer (1-5) |
| Likelihood | Number | Integer (1-5) |
| Status | Single Select | `Pending Review`, `Action Pending`, `Verification Pending`, `Closed` |
| Location | Single line text | GPS Coords |
| Site / Project | Single Select | Add your site names |
| Department | Single Select | Add your departments |
| Reporter ID | Single line text | |
| Persons Involved | Long text | |
| Equipment Involved | Long text | |
| Witnesses | Long text | |
| Root Cause | Long text | |
| Recommended Controls | Long text | |
| Reviewer | Single line text | |
| Review Date | Date | |
| Review Comments | Long text | |
| Action Assigned To | Single line text | |
| Action Due Date | Date | |
| Corrective Action | Long text | |
| Verification Comments | Long text | |
| Verification Photos | Attachment | Proof of fix |
| Attachments | Attachment | Initial evidence |
| Closed By | Single line text | |
| Closure Date | Date | |

### Table 3: `Crane Checklists`
| Field Name | Type |
|------------|------|
| Inspection Date | Date |
| Inspector Name | Single line text |
| Crane Type | Single line text |
| Plant Number | Single line text |
| Status | Single Select (`Operational`, `Grounded`) |
| Critical Failures | Long text |
| Inspection Data | Long text (JSON) |
| Image | Attachment |

### Table 4: `Equipment Checklists`
| Field Name | Type |
|------------|------|
| Inspection Date | Date |
| Inspector Name | Single line text |
| Equipment Type | Single line text |
| Plant Number | Single line text |
| Status | Single Select (`Operational`, `Grounded`) |
| Critical Failures | Long text |
| Inspection Data | Long text (JSON) |
| Image | Attachment |

### Table 5: `Training Roster`
| Field Name | Type |
|------------|------|
| Project Name | Single line text |
| Topic Discussed | Single line text |
| Conducted By | Single line text |
| Trainees Count | Number |
| Attachments | Attachment | (Sign-in sheets/Photos) |

---

## 3. Connect the New Base

1. **Get Base ID**: Open your new Base. The ID is in the URL: `https://airtable.com/appXXXXXXXX` (starts with `app`).
2. **Generate Token**: Go to [airtable.com/create/tokens](https://airtable.com/create/tokens).
   * Scopes: `data.records:read`, `data.records:write`
   * Access: Select your new Base.
3. **Update Vercel**:
   * Update `VITE_AIRTABLE_BASE_ID` with the new Base ID.
   * Update `VITE_AIRTABLE_API_KEY` with the new Token.
   * **Redeploy**.
