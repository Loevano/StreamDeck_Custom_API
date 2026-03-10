# API Route Map

Generated: 2026-03-10T14:46:35.621Z
Base URL: `http://127.0.0.1:8787`
Layout ID: `demo-show`
Pages: **8**  Actionable routes: **45**

## Page 1 - Obj Select (`xl-page-1-obj-select`)

State endpoint: `GET /api/hardware/streamdeck/layout/xl-page-1-obj-select/state`

| Key | Title | Method | Path | Purpose |
| --- | --- | --- | --- | --- |
| R1C1 | Status | GET | /api/hardware/streamdeck/status | Read compact runtime state |
| R1C2 | ObjClr | GET | /api/hardware/streamdeck/object-selection/clear | Clear selected object IDs |
| R1C3 | GrpClr | GET | /api/hardware/streamdeck/group-selection/clear | Clear selected group ID |
| R1C4 | SEL 1VA | GET | /api/hardware/streamdeck/object/1VA/select | Select object 1VA |
| R1C5 | SEL 1VB | GET | /api/hardware/streamdeck/object/1VB/select | Select object 1VB |
| R1C6 | SEL 1VC | GET | /api/hardware/streamdeck/object/1VC/select | Select object 1VC |
| R1C7 | SEL 1VD | GET | /api/hardware/streamdeck/object/1VD/select | Select object 1VD |
| R1C8 | SEL VA1 | GET | /api/hardware/streamdeck/object/VA1/select | Select object VA1 |
| R2C1 | SEL VA2 | GET | /api/hardware/streamdeck/object/VA2/select | Select object VA2 |
| R2C2 | SEL VA3 | GET | /api/hardware/streamdeck/object/VA3/select | Select object VA3 |
| R2C3 | GRP VA1- | GET | /api/hardware/streamdeck/group/VA1-group/select | Select group VA1-group |
| R2C4 | GRP va1- | GET | /api/hardware/streamdeck/group/va1-group/select | Select group va1-group |

## Page 2 - Obj Hide (`xl-page-2-obj-hide`)

State endpoint: `GET /api/hardware/streamdeck/layout/xl-page-2-obj-hide/state`

| Key | Title | Method | Path | Purpose |
| --- | --- | --- | --- | --- |
| R1C1 | Status | GET | /api/hardware/streamdeck/status | Read compact runtime state |
| R1C2 | AllHide | GET | /api/hardware/streamdeck/objects/hide/toggle | Toggle all object hide states |
| R1C3 | H 1VA | GET | /api/hardware/streamdeck/object/1VA/hide/toggle | Toggle hidden state for object 1VA |
| R1C4 | H 1VB | GET | /api/hardware/streamdeck/object/1VB/hide/toggle | Toggle hidden state for object 1VB |
| R1C5 | H 1VC | GET | /api/hardware/streamdeck/object/1VC/hide/toggle | Toggle hidden state for object 1VC |
| R1C6 | H 1VD | GET | /api/hardware/streamdeck/object/1VD/hide/toggle | Toggle hidden state for object 1VD |
| R1C7 | H VA1 | GET | /api/hardware/streamdeck/object/VA1/hide/toggle | Toggle hidden state for object VA1 |
| R1C8 | H VA2 | GET | /api/hardware/streamdeck/object/VA2/hide/toggle | Toggle hidden state for object VA2 |
| R2C1 | H VA3 | GET | /api/hardware/streamdeck/object/VA3/hide/toggle | Toggle hidden state for object VA3 |

## Page 3 - Group Enable (`xl-page-3-group-enable`)

State endpoint: `GET /api/hardware/streamdeck/layout/xl-page-3-group-enable/state`

| Key | Title | Method | Path | Purpose |
| --- | --- | --- | --- | --- |
| R1C1 | Status | GET | /api/hardware/streamdeck/status | Read compact runtime state |
| R1C2 | GrpAll | GET | /api/hardware/streamdeck/groups/enabled/toggle | Toggle all object group linking |
| R1C3 | AllView | GET | /api/hardware/streamdeck/objects/hide/toggle | Toggle all object visibility |
| R1C4 | GE VA1-g | GET | /api/hardware/streamdeck/group/VA1-group/enabled/toggle | Toggle enabled state for group VA1-group |
| R1C5 | GE va1-g | GET | /api/hardware/streamdeck/group/va1-group/enabled/toggle | Toggle enabled state for group va1-group |

## Page 4 - Trigger Actions (`xl-page-4-actions`)

State endpoint: `GET /api/hardware/streamdeck/layout/xl-page-4-actions/state`

| Key | Title | Method | Path | Purpose |
| --- | --- | --- | --- | --- |
| R1C1 | Status | GET | /api/hardware/streamdeck/status | Read compact runtime state |
| R1C2 | TR actio | GET | /api/hardware/streamdeck/action/action/trigger | Trigger action action |
| R1C3 | EN actio | GET | /api/hardware/streamdeck/action/action/enabled/toggle | Toggle enabled state for action action |
| R1C4 | LFO acti | GET | /api/hardware/streamdeck/action/action/lfo/lfo/enabled/toggle | Toggle LFO lfo for action action |

## Page 5 - Trigger Action Groups (`xl-page-5-action-groups`)

State endpoint: `GET /api/hardware/streamdeck/layout/xl-page-5-action-groups/state`

| Key | Title | Method | Path | Purpose |
| --- | --- | --- | --- | --- |
| R1C1 | Status | GET | /api/hardware/streamdeck/status | Read compact runtime state |
| R1C2 | TR group | GET | /api/hardware/streamdeck/action-group/group-fly-in/trigger | Trigger action group group-fly-in |
| R1C3 | EN group | GET | /api/hardware/streamdeck/action-group/group-fly-in/enabled/toggle | Toggle enabled state for action group group-fly-in |

## Page 6 - Empty (`xl-page-6-empty`)

State endpoint: `GET /api/hardware/streamdeck/layout/xl-page-6-empty/state`

| Key | Title | Method | Path | Purpose |
| --- | --- | --- | --- | --- |
| R1C1 | Status | GET | /api/hardware/streamdeck/status | Read compact runtime state |

## Page 7 - Empty (`xl-page-7-empty`)

State endpoint: `GET /api/hardware/streamdeck/layout/xl-page-7-empty/state`

| Key | Title | Method | Path | Purpose |
| --- | --- | --- | --- | --- |
| R1C1 | Status | GET | /api/hardware/streamdeck/status | Read compact runtime state |

## Page 8 - Config (`xl-page-8-config`)

State endpoint: `GET /api/hardware/streamdeck/layout/xl-page-8-config/state`

| Key | Title | Method | Path | Purpose |
| --- | --- | --- | --- | --- |
| R1C1 | Status | GET | /api/hardware/streamdeck/status | Read compact runtime state |
| R1C2 | Save | GET | /api/hardware/streamdeck/show/save | Persist current show |
| R1C3 | LoadCur | GET | /api/hardware/streamdeck/show/load/current | Reload current show |
| R1C4 | LoadNxt | GET | /api/hardware/streamdeck/show/load/next | Load next show in showfiles list |
| R1C5 | SaveAs | GET | /api/hardware/streamdeck/show/save-as/timestamp | Save current show under timestamped path |
| R1C6 | AddShow | GET | /api/hardware/streamdeck/show/new/timestamp | Create and load a new timestamped show |
| R1C7 | GrpAll | GET | /api/hardware/streamdeck/groups/enabled/toggle | Toggle all object group linking |
| R1C8 | LFOAll | GET | /api/hardware/streamdeck/lfos/enabled/toggle | Toggle all LFO processing |
| R2C1 | ObjClr | GET | /api/hardware/streamdeck/object-selection/clear | Clear selected object IDs |
| R2C2 | GrpClr | GET | /api/hardware/streamdeck/group-selection/clear | Clear selected group ID |

## Endpoint Catalog

| Method | Path | Used By |
| --- | --- | --- |
| GET | /api/hardware/streamdeck/action-group/group-fly-in/enabled/toggle | Page 5 - Trigger Action Groups / R1C3 (EN group) |
| GET | /api/hardware/streamdeck/action-group/group-fly-in/trigger | Page 5 - Trigger Action Groups / R1C2 (TR group) |
| GET | /api/hardware/streamdeck/action/action/enabled/toggle | Page 4 - Trigger Actions / R1C3 (EN actio) |
| GET | /api/hardware/streamdeck/action/action/lfo/lfo/enabled/toggle | Page 4 - Trigger Actions / R1C4 (LFO acti) |
| GET | /api/hardware/streamdeck/action/action/trigger | Page 4 - Trigger Actions / R1C2 (TR actio) |
| GET | /api/hardware/streamdeck/group-selection/clear | Page 1 - Obj Select / R1C3 (GrpClr); Page 8 - Config / R2C2 (GrpClr) |
| GET | /api/hardware/streamdeck/group/va1-group/enabled/toggle | Page 3 - Group Enable / R1C5 (GE va1-g) |
| GET | /api/hardware/streamdeck/group/VA1-group/enabled/toggle | Page 3 - Group Enable / R1C4 (GE VA1-g) |
| GET | /api/hardware/streamdeck/group/va1-group/select | Page 1 - Obj Select / R2C4 (GRP va1-) |
| GET | /api/hardware/streamdeck/group/VA1-group/select | Page 1 - Obj Select / R2C3 (GRP VA1-) |
| GET | /api/hardware/streamdeck/groups/enabled/toggle | Page 3 - Group Enable / R1C2 (GrpAll); Page 8 - Config / R1C7 (GrpAll) |
| GET | /api/hardware/streamdeck/lfos/enabled/toggle | Page 8 - Config / R1C8 (LFOAll) |
| GET | /api/hardware/streamdeck/object-selection/clear | Page 1 - Obj Select / R1C2 (ObjClr); Page 8 - Config / R2C1 (ObjClr) |
| GET | /api/hardware/streamdeck/object/1VA/hide/toggle | Page 2 - Obj Hide / R1C3 (H 1VA) |
| GET | /api/hardware/streamdeck/object/1VA/select | Page 1 - Obj Select / R1C4 (SEL 1VA) |
| GET | /api/hardware/streamdeck/object/1VB/hide/toggle | Page 2 - Obj Hide / R1C4 (H 1VB) |
| GET | /api/hardware/streamdeck/object/1VB/select | Page 1 - Obj Select / R1C5 (SEL 1VB) |
| GET | /api/hardware/streamdeck/object/1VC/hide/toggle | Page 2 - Obj Hide / R1C5 (H 1VC) |
| GET | /api/hardware/streamdeck/object/1VC/select | Page 1 - Obj Select / R1C6 (SEL 1VC) |
| GET | /api/hardware/streamdeck/object/1VD/hide/toggle | Page 2 - Obj Hide / R1C6 (H 1VD) |
| GET | /api/hardware/streamdeck/object/1VD/select | Page 1 - Obj Select / R1C7 (SEL 1VD) |
| GET | /api/hardware/streamdeck/object/VA1/hide/toggle | Page 2 - Obj Hide / R1C7 (H VA1) |
| GET | /api/hardware/streamdeck/object/VA1/select | Page 1 - Obj Select / R1C8 (SEL VA1) |
| GET | /api/hardware/streamdeck/object/VA2/hide/toggle | Page 2 - Obj Hide / R1C8 (H VA2) |
| GET | /api/hardware/streamdeck/object/VA2/select | Page 1 - Obj Select / R2C1 (SEL VA2) |
| GET | /api/hardware/streamdeck/object/VA3/hide/toggle | Page 2 - Obj Hide / R2C1 (H VA3) |
| GET | /api/hardware/streamdeck/object/VA3/select | Page 1 - Obj Select / R2C2 (SEL VA3) |
| GET | /api/hardware/streamdeck/objects/hide/toggle | Page 2 - Obj Hide / R1C2 (AllHide); Page 3 - Group Enable / R1C3 (AllView) |
| GET | /api/hardware/streamdeck/show/load/current | Page 8 - Config / R1C3 (LoadCur) |
| GET | /api/hardware/streamdeck/show/load/next | Page 8 - Config / R1C4 (LoadNxt) |
| GET | /api/hardware/streamdeck/show/new/timestamp | Page 8 - Config / R1C6 (AddShow) |
| GET | /api/hardware/streamdeck/show/save | Page 8 - Config / R1C2 (Save) |
| GET | /api/hardware/streamdeck/show/save-as/timestamp | Page 8 - Config / R1C5 (SaveAs) |
| GET | /api/hardware/streamdeck/status | Page 1 - Obj Select / R1C1 (Status); Page 2 - Obj Hide / R1C1 (Status); Page 3 - Group Enable / R1C1 (Status); Page 4 - Trigger Actions / R1C1 (Status); Page 5 - Trigger Action Groups / R1C1 (Status); Page 6 - Empty / R1C1 (Status); Page 7 - Empty / R1C1 (Status); Page 8 - Config / R1C1 (Status) |

