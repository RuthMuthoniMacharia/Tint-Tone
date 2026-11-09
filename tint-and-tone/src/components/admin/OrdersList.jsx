import { useStore } from "../../context/useStore.js";
import { nextStatus } from "../../data/statuses.js";
import { kes } from "../../utils/money.js";

export default function OrdersList({ status }) {
  const { orders, advanceOrder } = useStore();
  const shown = orders.filter((o) => o.status === status);

  return (
    <>
      <h3>{status} orders</h3>
      {shown.length === 0 && (
        <p className="muted">No {status.toLowerCase()} orders.</p>
      )}
      {shown.map((o) => {
        const next = nextStatus(o.status);
        return (
          <div className="row" key={o.id}>
            <span>
              <strong>#{o.id}</strong> · {o.user} · {o.date}
              <br />
              <small className="muted">
                {o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                <br />
                Deliver to: {o.address} · Paid by {o.method}
              </small>
            </span>
            <span className="adm-actions">
              {kes(o.total)}
              {next && (
                <button className="btn sm" onClick={() => advanceOrder(o.id)}>
                  Mark {next}
                </button>
              )}
            </span>
          </div>
        );
      })}
    </>
  );
}
