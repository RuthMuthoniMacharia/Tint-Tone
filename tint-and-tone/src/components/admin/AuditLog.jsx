import { useState, useEffect } from "react";
import { adminGet } from "../../utils/adminApi.js";
import "./Reports.css";

const when = (d) => (d ? new Date(d).toLocaleString() : "");

export default function AuditLog() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState(null); // null = still loading
  const [error, setError] = useState("");

  const show = (result) => {
    if (result.error) {
      setRows([]);
      setError(result.error);
    } else {
      setRows(result.data);
      setError("");
    }
  };

  // Load the latest entries when the tab opens
  useEffect(() => {
    adminGet("audit-logs").then(show);
  }, []);

  const apply = async (e) => {
    e.preventDefault();
    show(await adminGet("audit-logs", { from, to }));
  };

  return (
    <>
      <h3>Audit log</h3>
      <p className="muted">
        A record of who did what in the admin panel (latest 200 entries).
      </p>
      <form className="rpt-form" onSubmit={apply}>
        <div>
          <label htmlFor="afrom">From</label>
          <input
            id="afrom"
            className="inp"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="ato">To</label>
          <input
            id="ato"
            className="inp"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <button className="btn" type="submit">
          Filter
        </button>
      </form>

      {error && <div className="note bad">{error}</div>}
      {rows === null && <p className="muted">Loading...</p>}
      {rows && rows.length === 0 && !error && (
        <p className="muted">No entries for these dates.</p>
      )}
      {rows && rows.length > 0 && (
        <div className="adm-scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Item</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.log_id}>
                  <td>{when(r.created_at)}</td>
                  <td>{r.admin_name}</td>
                  <td>{r.action_type}</td>
                  <td>
                    {r.target_entity} {r.target_id ? `#${r.target_id}` : ""}
                  </td>
                  <td>{r.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}