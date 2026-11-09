import { useState } from "react";
import Inventory from "../components/admin/Inventory.jsx";
import OrdersList from "../components/admin/OrdersList.jsx";
import { useStore } from "../context/useStore.js";
import { PENDING } from "../data/statuses.js";
import { kes } from "../utils/money.js";
import "./Admin.css";

// section is one of: "Processing" | "Packed" | "Shipped" | "items" | "Delivered"
export default function Admin() {
  const { orders, products } = useStore();
  const [section, setSection] = useState("Processing");

  const countOf = (status) => orders.filter((o) => o.status === status).length;
  const turnover = orders.reduce((sum, o) => sum + o.total, 0);
  const lowStock = products.filter((p) => p.active && p.stock <= 5).length;

  const menuClass = (key) => (section === key ? "on" : "");

  return (
    <>
      <h2 className="adm-title">Admin panel</h2>

      <div className="adm-stats">
        <div>
          <strong>{orders.length}</strong>
          <span>Orders</span>
        </div>
        <div>
          <strong>{kes(turnover)}</strong>
          <span>Turnover</span>
        </div>
        <div>
          <strong>{lowStock}</strong>
          <span>Low stock items</span>
        </div>
      </div>

      <div className="adm-layout">
        <nav className="adm-menu" aria-label="Admin sections">
          <button
            className={PENDING.includes(section) ? "on" : ""}
            onClick={() => setSection("Processing")}
          >
            Pending Orders
          </button>
          {PENDING.map((status) => (
            <button
              key={status}
              className={"sub " + menuClass(status)}
              onClick={() => setSection(status)}
            >
              {status} ({countOf(status)})
            </button>
          ))}
          <button
            className={menuClass("items")}
            onClick={() => setSection("items")}
          >
            Current items
          </button>
          <button
            className={menuClass("Delivered")}
            onClick={() => setSection("Delivered")}
          >
            Delivered Orders ({countOf("Delivered")})
          </button>
        </nav>

        <section className="panel adm-content">
          {section === "items" ? (
            <Inventory />
          ) : (
            <OrdersList status={section} />
          )}
        </section>
      </div>
    </>
  );
}
