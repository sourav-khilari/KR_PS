export function LoginPlaceholder() {
  return (
    <aside className="login-panel">
      <h1>Truck Load Payments</h1>
      <p>Login placeholder</p>
      <label>
        User
        <input value="admin" readOnly />
      </label>
      <label>
        Password
        <input value="********" readOnly type="password" />
      </label>
      <button type="button" disabled>
        Authentication coming later
      </button>
    </aside>
  );
}
