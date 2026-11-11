import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Field from "../components/Field.jsx";
import { useStore } from "../context/useStore.js";
import { kes } from "../utils/money.js";
import { validateSignIn, validateSignUp } from "../utils/validate.js";

export default function Account() {
  const { user, users, orders, signIn, signUp, signOut } = useStore();
  const navigate = useNavigate();
  const { state } = useLocation();
  const from = state?.from || "/"; // where the visitor was heading

  // Where to go after signing in: admins go to their panel, everyone else
  // returns to where they were, but never to an admin address.
  const destinationFor = (u) => {
    if (u.role === "admin") return "/admin";
    return from.startsWith("/admin") ? "/" : from;
  };

  const [inForm, setInForm] = useState({ username: "", password: "" });
  const [inErrors, setInErrors] = useState({});
  const [upForm, setUpForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [upErrors, setUpErrors] = useState({});

  // One handler for every field: uses the input's name attribute as the key
  const change = (setForm) => (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSignIn = (e) => {
    e.preventDefault();
    const errors = validateSignIn(inForm);
    let signedIn = null;
    if (!Object.keys(errors).length) {
      signedIn = signIn(inForm.username, inForm.password); // user object or null
      if (!signedIn) errors.form = "Incorrect username or password";
    }
    setInErrors(errors);
    if (signedIn) navigate(destinationFor(signedIn)); // one redirect only
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    const errors = validateSignUp(upForm, users);
    setUpErrors(errors);
    if (!Object.keys(errors).length) {
      const result = await signUp(upForm);
      if (result.error) setUpErrors({ form: result.error });
      else navigate(from.startsWith("/admin") ? "/" : from);
    }
  };

  if (user) {
    // Admins have no shopping history: send them to their panel
    if (user.role === "admin") {
      return (
        <section className="panel">
          <h2>Hello, {user.username}</h2>
          <p className="muted">{user.email} · Administrator</p>
          <Link className="btn" to="/admin">
            Go to admin panel
          </Link>{" "}
          <button className="btn ghost" onClick={signOut}>
            Sign out
          </button>
        </section>
      );
    }

    // Only this customer's orders
    const myOrders = orders.filter((o) => o.user === user.username);

    return (
      <section className="panel">
        <h2>Hello, {user.username}</h2>
        <p className="muted">{user.email}</p>

        <h3>My orders</h3>
        {myOrders.length === 0 && <p>No orders yet.</p>}
        {myOrders.map((o) => (
          <div className="row" key={o.id}>
            <span>
              #{o.id} · {o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
              {o.delivery && (
                <>
                  <br />
                  <small className="muted">
                    Delivery: {o.delivery.courier} on {o.delivery.date}
                  </small>
                </>
              )}
              {o.cancelReason && (
                <>
                  <br />
                  <small className="muted">Cancelled: {o.cancelReason}</small>
                </>
              )}
            </span>
            <span>
              {kes(o.total)} · <strong>{o.status}</strong>
            </span>
          </div>
        ))}

        <button
          className="btn ghost"
          style={{ marginTop: 16 }}
          onClick={signOut}
        >
          Sign out
        </button>
      </section>
    );
  }

  return (
    <>
      {state?.notice && <div className="note bad">{state.notice}</div>}
      <div className="cols">
        <form className="col" onSubmit={handleSignIn} noValidate>
          <h2>Sign in</h2>
          {inErrors.form && <div className="note bad">{inErrors.form}</div>}
          <Field
            label="Username"
            name="username"
            value={inForm.username}
            onChange={change(setInForm)}
            error={inErrors.username}
            autoComplete="username"
          />
          <Field
            label="Password"
            name="password"
            type="password"
            value={inForm.password}
            onChange={change(setInForm)}
            error={inErrors.password}
            autoComplete="current-password"
          />
          <button className="btn" type="submit">
            Confirm
          </button>
          {/* <small className="muted">Demo admin: admin / admin123</small> */}
        </form>

        <form className="col" onSubmit={handleSignUp} noValidate>
          <h2>Sign up</h2>
          {upErrors.form && <div className="note bad">{upErrors.form}</div>}
          {/* autoComplete="off": stops the browser filling in a saved login
      (such as admin) where a brand new username belongs */}

          <Field
            label="Username"
            name="username"
            value={upForm.username}
            onChange={change(setUpForm)}
            error={upErrors.username}
            autoComplete="off"
          />
          <Field
            label="Email address"
            name="email"
            type="email"
            value={upForm.email}
            onChange={change(setUpForm)}
            error={upErrors.email}
            autoComplete="email"
          />
          <Field
            label="Password"
            name="password"
            type="password"
            value={upForm.password}
            onChange={change(setUpForm)}
            error={upErrors.password}
            autoComplete="new-password"
          />
          <Field
            label="Confirm password"
            name="confirm"
            type="password"
            value={upForm.confirm}
            onChange={change(setUpForm)}
            error={upErrors.confirm}
            autoComplete="new-password"
          />
          <button className="btn" type="submit">
            Confirm
          </button>
        </form>
      </div>
    </>
  );
}
