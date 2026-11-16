import { useState } from "react";
import { adminGet } from "../../utils/adminApi.js";
import { kes } from "../../utils/money.js";
import "./Reports.css";

const TYPES = {
  sales: { label: "Sales report", path: "reports/sales" },
  products: { label: "Best selling products", path: "reports/products" },
  "low-stock": { label: "Low stock", path: "reports/low-stock" },
};
const STATUSES = ["Processing", "Packed", "Shipped", "Delivered", "Cancelled"];

const when = (d) => (d ? new Date(d).toLocaleString() : "");

export default function Reports() {
  const [type, setType] = useState("sales");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("date");
  const [dir, setDir] = useState("desc");
  const [threshold, setThreshold] = useState("5");
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const generate = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const params =
      type === "sales"
        ? { from, to, status, sort, dir }
        : type === "products"
          ? { from, to }
          : { threshold };
    const result = await adminGet(TYPES[type].path, params);
    setBusy(false);
    if (result.error) {
      setReport(null);
      return setError(result.error);
    }
    setReport({ type, ...result.data });
  };

  const company = report?.company;
  const f = report?.filters || {};

  return (
    <>
      <h3>Reports</h3>
      <form className="rpt-form" onSubmit={generate}>
        <div>
          <label htmlFor="rtype">Report</label>
          <select
            id="rtype"
            className="inp"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {Object.entries(TYPES).map(([key, t]) => (
              <option key={key} value={key}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {type !== "low-stock" && (
          <>
            <div>
              <label htmlFor="rfrom">From</label>
              <input
                id="rfrom"
                className="inp"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="rto">To</label>
              <input
                id="rto"
                className="inp"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </>
        )}

        {type === "sales" && (
          <>
            <div>
              <label htmlFor="rstatus">Status</label>
              <select
                id="rstatus"
                className="inp"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All except cancelled</option>
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="rsort">Sort by</label>
              <select
                id="rsort"
                className="inp"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="date">Date</option>
                <option value="total">Total</option>
                <option value="customer">Customer</option>
                <option value="status">Status</option>
              </select>
            </div>
            <div>
              <label htmlFor="rdir">Order</label>
              <select
                id="rdir"
                className="inp"
                value={dir}
                onChange={(e) => setDir(e.target.value)}
              >
                <option value="desc">Newest / highest first</option>
                <option value="asc">Oldest / lowest first</option>
              </select>
            </div>
          </>
        )}

        {type === "low-stock" && (
          <div>
            <label htmlFor="rthr">Stock at or below</label>
            <input
              id="rthr"
              className="inp"
              type="number"
              min="0"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </div>
        )}

        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Loading..." : "Generate"}
        </button>
        {report && (
          <button
            className="btn ghost"
            type="button"
            onClick={() => window.print()}
          >
            Print / Save as PDF
          </button>
        )}
      </form>

      {error && <div className="note bad">{error}</div>}

      {report && (
        <div className="rpt-sheet">
          <div className="rpt-head">
            <img
              className="rpt-logo"
              src={company?.logo || "/logo.png"}
              alt=""
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
            <div>
              <h3>{company?.name || "Tint & Tone"}</h3>
              <div className="rpt-meta">{company?.tagline}</div>
            </div>
          </div>

          <h3>{report.title}</h3>
          <div className="rpt-meta">Generated: {when(report.generated_at)}</div>
          {report.type !== "low-stock" && (
            <div className="rpt-meta">
              Period: {f.from || "start"} to {f.to || "today"}
              {report.type === "sales" && ` | Status: ${f.status}`}
            </div>
          )}
          {report.type === "low-stock" && (
            <div className="rpt-meta">
              Items with {f.threshold} or fewer in stock
            </div>
          )}

          {report.type === "sales" && (
            <div className="rpt-summary">
              <span>
                Orders: <strong>{report.summary.total_orders}</strong>
              </span>
              <span>
                Revenue: <strong>{kes(Number(report.summary.total_revenue))}</strong>
              </span>
              <span>
                Average order:{" "}
                <strong>{kes(Number(report.summary.average_order))}</strong>
              </span>
            </div>
          )}

          {report.rows.length === 0 ? (
            <p className="muted">No data for these filters.</p>
          ) : (
            <div className="adm-scroll">
              <table>
                {report.type === "sales" && (
                  <>
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Status</th>
                        <th>Payment</th>
                        <th>Reference</th>
                        <th className="num">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.rows.map((r) => (
                        <tr key={r.order_id}>
                          <td>#{r.order_id}</td>
                          <td>{when(r.order_date)}</td>
                          <td>{r.customer}</td>
                          <td>{r.order_status}</td>
                          <td>{r.payment_method || "-"}</td>
                          <td>{r.transaction_ref || "-"}</td>
                          <td className="num">{kes(Number(r.total_amount))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}
                {report.type === "products" && (
                  <>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th className="num">Units sold</th>
                        <th className="num">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.rows.map((r) => (
                        <tr key={r.product_id}>
                          <td>{r.name}</td>
                          <td>{r.category}</td>
                          <td className="num">{r.units_sold}</td>
                          <td className="num">{kes(Number(r.revenue))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}
                {report.type === "low-stock" && (
                  <>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th className="num">In stock</th>
                        <th className="num">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.rows.map((r) => (
                        <tr key={r.product_id}>
                          <td>{r.name}</td>
                          <td>{r.category}</td>
                          <td className="num">{r.stock_quantity}</td>
                          <td className="num">{kes(Number(r.price))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}