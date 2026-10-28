# Semantic model: DirectQuery over the Eventhouse

`fabric/deploy/04_semantic_model.py` creates this model from the TMDL in `definition/`, so you
don't build it by hand. This page explains what is in it.

The app queries the model with DAX (`src/data/queries.ts`). The model is a thin layer: one
DirectQuery table per KQL function in `fabric/eventhouse/DatabaseSchema.kql`, all driven by one
M parameter, `Match_Id`.

| Table       | KQL behind it                       |
| ----------- | ----------------------------------- |
| Matches     | `match_events \| distinct match_id` - binds the parameter |
| Scoreline   | `Scoreline(<Match_Id>)`             |
| XgRace      | `XgRace(<Match_Id>)`                |
| Momentum    | `Momentum(<Match_Id>)`              |
| ShotMap     | `ShotMap(<Match_Id>)`               |
| PassNetwork | `PassNetwork(<Match_Id>)` - both teams, filter on `team` |
| PlayerStats | `PlayerStats(<Match_Id>)`           |
| KeyMoments  | `KeyMoments(<Match_Id>)`            |

`Match_Id` is bound to `Matches[match_id]`, which is what lets a DAX query set it per request:

```dax
DEFINE MPARAMETER 'Match_Id' = 69299
EVALUATE 'Scoreline'
```

The committed partitions point at a placeholder cluster
(`https://<eventhouse>.kusto.fabric.microsoft.com`) and database GUID. Step 4 rewrites both to the
Eventhouse from step 1 before uploading, and step 5 switches the data source to end-user SSO so
every app user queries the Eventhouse as themselves.

To change the model: edit the TMDL (or open it in Power BI Desktop from the workspace, change it
there and export), then run `python fabric/deploy/deploy.py --only 4` and `--only 5`.
