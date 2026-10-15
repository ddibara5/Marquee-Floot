// Read-only evidence retrieval. Run safeguards SQL using Floot execute_sql, not the VM proxy.
const resourceName="Floot Database for Marquee Floot Pilot";
const r=await _floot.runSQLQuery({resourceName,query:"select test,passed from verify_marquee_20260930_v1.test_results order by test"});
if(r.rows.length!==25||r.rows.some(x=>!x.passed))throw Error("SAFEGUARD_EVIDENCE_GATE");console.log(JSON.stringify({app:"marquee",tests:25,passed:true,results:r.rows}));