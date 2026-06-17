# Risk Profiler Checkpoint Validation Specification

## Overview

This document describes the validation logic implemented for all Risk Profile (RP) checkpoints.

For each checkpoint, the following information is documented:

* Purpose
* Data Elements Checked
* Validation Logic
* PASS Criteria
* FAIL Criteria
* NOT APPLICABLE (NA) Criteria

---

# RP1 – Assessment Approval Validation

## Purpose

Verify that the Risk Profile assessment has received the required approvals.

## Data Checked

* Assessment ID
* Review Summary voteCode values

## Validation Logic

1. Retrieve assessmentId from the current assessment.
2. Locate the matching assessment in reviewSummary.
3. Collect all voteCode values.
4. Validate that at least two voteCode values exist.
5. Validate first two voteCode values are:

```
A
A
```

(A = Approved)

## PASS

* Matching assessment found.
* First two voteCode values are A.

## FAIL

* Assessment ID missing.
* Assessment not found in review summary.
* Less than two voteCode values found.
* One or more approval values are not A.

## NA

* Not applicable is never returned.

---

# RP2 – Web Application URL Validation

## Purpose

Ensure web-based applications provide at least one URL.

## Data Checked

* CSIR-AppType
* Survey Question Summary Collector Values
* URL-related assessment answers
* Assessment/Application metadata

## Validation Logic

Checkpoint only applies when application type contains:

* Web Application
* Web Service
* API
* SaaS

Validation searches for URLs in:

### Source 1

Question Summary API

```
/assessment/survey/{assessmentId}/question/{surveyTemplateQuestionId}
```

Collector Value:

```
collectorValue
```

### Source 2

Assessment answers containing:

* URL
* URI
* Link

### Source 3

Assessment/Application detail objects

Keys containing:

* url
* uri
* link

## PASS

At least one valid HTTP/HTTPS URL found.

## FAIL

Web-based application selected but no URL found.

## NA

Application type is not:

* Web Application
* Web Service/API
* SaaS

---

# RP3 – WSSO Usage Validation

## Purpose

Validate that WSSO is used only with supported application types.

## Data Checked

* CSIR-MFA
* CSIR-AppType
* CSIR-IPOwner

## Validation Logic

If:

```
MFA via Web Single Sign On (WSSO)
```

is selected:

### Scenario 1

Application type is:

* Web Application
* Web Service
* API
* SaaS

Result = PASS

### Scenario 2

Non-web application

Then verify:

```
CSIR-IPOwner contains Boeing
```

## PASS

* WSSO + Web Application
  OR
* WSSO + Boeing-owned IP

## FAIL

WSSO selected but:

* Not web-based
  AND
* IP owner is not Boeing

## NA

WSSO not selected.

---

# RP4 – Device Count Validation

## Purpose

Ensure deployable applications specify valid device counts.

## Data Checked

* CSIR-AppType
* CSIR-DeviceCount

## Applicable App Types

* Web Application
* Web Service
* Client-Server
* Desktop
* Mobile
* Database
* Container
* Embedded Device
* IaaS
* Integration Platform
* Mainframe
* Script/Automation
* Security Service
* Thick Client
* Thin Client
* Virtual Desktop
* Dashboard/BI
* API Gateway

## Validation Logic

1. Determine whether application type requires deployment.
2. Verify CSIR-DeviceCount answered.
3. Verify value is NOT:

```
Not installed/deployed on any device
```

## PASS

Valid device count selected.

## FAIL

* Device count missing.
* Device count = Not installed/deployed on any device.

## NA

Application type does not require deployment validation.

---

# RP5 – MFA Requires Personal Information Data

## Purpose

Ensure MFA-enabled applications identify personal information.

## Data Checked

* CSIR-MFA
* CSIR-Data

## Validation Logic

If MFA is applicable:

Verify CSIR-Data contains:

* Personally Identifiable Information
* Personal Information
* IPSM 2.2.9

## PASS

Personal information data type selected.

## FAIL

MFA applicable but no personal information data identified.

## NA

MFA = Not Applicable or unanswered.

---

# RP6 – Export Control Classification Match

## Purpose

Validate classification consistency with Export Control references.

## Data Checked

* CSIR-CodeClassification
* Export Control Group

## Mapping

| Export Group | Required Classification |
| ------------ | ----------------------- |
| EARN         | EAR_NLR                 |
| EARL         | EAR_LR                  |
| ITAR         | ITAR                    |
| NULL         | NOT_SUBJECT             |

## SaaS Special Rule

SaaS applications must be:

```
NOT_SUBJECT
```

## PASS

Selected classification matches expected mapping.

## FAIL

Selected classification does not match Export Control reference.

## NA

Export Control Group cannot be determined.

---

# RP7 – Export Controlled Data Validation

## Purpose

Ensure Export Controlled applications specify EAR/ITAR classification.

## Data Checked

* CSIR-ExportControlled
* CSIR-ExportControlled-Jurisdiction
* CSIR-USEC-EAR-NLR
* CSIR-USEC-EAR-LR
* CSIR-USEC-ITAR

## Validation Logic

If Export Controlled = Yes

Verify at least one:

* EAR-NLR = Yes
* EAR-LR = Yes
* ITAR = Yes

## PASS

At least one export-control type selected.

## FAIL

None selected.

## NA

* Export Controlled != Yes
* Jurisdiction = Other

---

# RP8 – Hosting vs Architecture Validation

## Purpose

Ensure hosting selections match Internal/External/Hybrid architecture.

## Data Checked

* CSIR-Hosting
* CSIR-IntExtApp

## Mapping

### Internal

* BEN
* Internal Boeing Cloud
* SHE
* Secure Lab
* Secure Access Zone
* Isolated Lab

### External

* External Boeing Cloud
* Third Party Vendor
* SaaS Provider

## Validation Logic

| Hosting Type | Required Architecture |
| ------------ | --------------------- |
| Internal     | Internal              |
| External     | External              |
| Both         | Hybrid                |

## PASS

Architecture matches hosting selections.

## FAIL

Architecture does not match hosting selections.

## NA

* Hosting missing.
* Hosting = None/Other.
* CSIR-IntExtApp not present.

---

# RP9 – Developer Person Classification Validation

## Purpose

Ensure developer classifications exist within Person Class selections.

## Data Checked

* CSIR-DevPersonClassification
* CSIR-PersonClass

## Validation Logic

Validate mapping:

| Developer Type      | Required Person Class |
| ------------------- | --------------------- |
| Boeing employees    | Boeing Employees      |
| Boeing Customers    | Boeing Customers      |
| Boeing Suppliers    | Boeing Suppliers      |
| Boeing subsidiaries | Boeing Subsidiary     |
| Contract Labor      | Contract Labor        |
| Consultants         | Consultants           |
| Industry Assist     | Industry Assist       |
| Purchased Services  | Purchased Services    |

## PASS

All mapped Person Classes selected.

## FAIL

One or more required Person Classes missing.

## NA

Developer classifications are None or unanswered.

---

# RP10 – Service Account Validation

## Purpose

Ensure applications expected to use service accounts identify them.

## Data Checked

* CSIR-Database
* CSIR-AppType
* CSIR-SvcAcct

## Service Account Expected When

### Database

CSIR-Database = Yes

OR

### Application Types

* Web Application
* Web Service
* API
* Client-Server
* Dashboard
* Tableau
* Cognos
* PowerBI
* Data Warehouse
* Analytics Platform

## PASS

CSIR-SvcAcct = Yes

## FAIL

CSIR-SvcAcct = No or unanswered.

## NA

Application characteristics do not indicate service account usage.

---

# RP11 – Nonperson Account Disable Validation

## Purpose

Ensure nonperson accounts are disabled when no longer required.

## Data Checked

* CSIR-SvcAcct
* CSIR-SCR-NonpersonAcct-Disable

## PASS

Answer is:

* Yes
  OR
* No

## FAIL

Question unanswered.

## NA

CSIR-SvcAcct != Yes

---

# RP12 – Nonperson Account Restriction Validation

## Purpose

Ensure nonperson accounts are restricted to authorized purposes.

## Data Checked

* CSIR-SvcAcct
* CSIR-SCR-NonpersonAcct-Restricted

## PASS

Answer is:

* Yes
  OR
* No

## FAIL

Question unanswered.

## NA

CSIR-SvcAcct != Yes

---

# RP13 – Nonperson Account Management Validation

## Purpose

Ensure nonperson accounts are managed appropriately.

## Data Checked

* CSIR-SvcAcct
* CSIR-SCR-NonpersonAcct-Managed

## PASS

Answer is:

* Yes
  OR
* No

## FAIL

Question unanswered.

## NA

CSIR-SvcAcct != Yes

---

# Summary Matrix

| Checkpoint | Purpose                                  |
| ---------- | ---------------------------------------- |
| RP1        | Approval Validation                      |
| RP2        | URL Validation                           |
| RP3        | WSSO Validation                          |
| RP4        | Device Count Validation                  |
| RP5        | MFA → Personal Information Validation   |
| RP6        | Export Control Classification Validation |
| RP7        | Export Controlled Data Validation        |
| RP8        | Hosting vs Architecture Validation       |
| RP9        | Developer Classification Mapping         |
| RP10       | Service Account Requirement Validation   |
| RP11       | Nonperson Account Disable Validation     |
| RP12       | Nonperson Account Restriction Validation |
| RP13       | Nonperson Account Management Validation  |
