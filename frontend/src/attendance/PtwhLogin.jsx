import { useState } from "react";
import { api } from "../api";
import { btnCls, Field, inputCls, Modal } from "./ui";

// The PTWH's login for the PTWH app. The STATION sets the first username + password (a random temporary one, shown once together with a recovery
// code); the PTWH changes the password in their own app. Forgot it? They use the recovery code in the app, or the station resets it here.

// "ALI BIN ABU" -> "ali.abu": first and last word of the name, the way a station would type it.
function suggestUsername(name) {
  const w = (name || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  if (!w.length) return "";
  return w.length === 1 ? w[0] : `${w[0]}.${w[w.length - 1]}`;
}

function Credentials({ worker, creds, username, appUrl, onClose }) {
  const [copied, setCopied] = useState(false);
  const msg = [
    `PTWH app login for ${worker.name}`,
    appUrl ? `App: ${appUrl}` : null,
    `Username: ${username}`,
    `Temporary password: ${creds.temp_password}`,
    `Recovery code (keep it safe, for a forgotten password): ${creds.recovery_code}`,
    "Please change your password the first time you log in.",
  ].filter(Boolean).join("\n");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(msg);
      setCopied(true);
    } catch {
      /* clipboard blocked -- the details are on screen */
    }
  };
  return (
    <div className="space-y-3 text-sm">
      <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900 ring-1 ring-amber-200">
        Write these down or copy them <strong>now</strong> -- the password and recovery code are not shown again (only a reset makes new ones).
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-lg bg-slate-50 p-3">
        <dt className="text-slate-500">Username</dt><dd className="font-mono font-semibold">{username}</dd>
        <dt className="text-slate-500">Temporary password</dt><dd className="font-mono font-semibold tracking-wider">{creds.temp_password}</dd>
        <dt className="text-slate-500">Recovery code</dt><dd className="font-mono font-semibold tracking-wider">{creds.recovery_code}</dd>
      </dl>
      <div className="flex justify-end gap-2">
        <button onClick={copy} className={`${btnCls} border border-slate-300 text-slate-700`}>{copied ? "Copied" : "Copy for WhatsApp"}</button>
        <button onClick={onClose} className={`${btnCls} bg-brand text-white`}>Done</button>
      </div>
    </div>
  );
}

export default function LoginModal({ worker, login, appUrl, onClose, onChanged, setError }) {
  const [username, setUsername] = useState(login?.username || suggestUsername(worker.name));
  const [creds, setCreds] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn, after) => {
    setBusy(true);
    try {
      const r = await fn();
      if (after) after(r);
      onChanged();
    } catch (e) {
      setError(e.message);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`PTWH app login · ${worker.name}`} onClose={creds ? () => { onChanged(); onClose(); } : onClose}>
      {creds ? (
        <Credentials worker={worker} creds={creds} username={username} appUrl={appUrl} onClose={() => { onChanged(); onClose(); }} />
      ) : !login ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Give {worker.name} a username. We make a temporary password and a recovery code -- you pass them on, and they can change the password themselves in the PTWH app.
          </p>
          <Field label="Username (letters, numbers, dot, dash)">
            <input className={`${inputCls} w-full font-mono`} value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} maxLength={30} />
          </Field>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className={`${btnCls} text-slate-600`}>Cancel</button>
            <button disabled={busy || username.length < 3} onClick={() => run(() => api.ptwhLoginCreate(worker.id, username), setCreds)} className={`${btnCls} bg-brand text-white disabled:opacity-50`}>Create login</button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-lg bg-slate-50 p-3">
            <dt className="text-slate-500">Username</dt><dd className="font-mono font-semibold">{login.username}</dd>
            <dt className="text-slate-500">Status</dt><dd>{login.disabled ? <span className="text-red-600">Switched off</span> : "Active"}</dd>
            <dt className="text-slate-500">Last login</dt><dd>{login.last_login_at ? login.last_login_at.replace("T", " ") : "Never"}</dd>
            <dt className="text-slate-500">Password</dt><dd>{login.password_set_by === "self" ? "Changed by the PTWH" : "Still the temporary one from the station"}</dd>
          </dl>
          <p className="text-xs text-slate-500">Forgot the password and has no recovery code? Reset it -- you get a new temporary password and recovery code, and the old password stops working.</p>
          <div className="flex flex-wrap justify-end gap-2">
            <button disabled={busy} onClick={() => run(() => api.ptwhLoginDisable(worker.id, !login.disabled), () => onClose())} className={`${btnCls} border border-slate-300 text-slate-700`}>
              {login.disabled ? "Switch login on" : "Switch login off"}
            </button>
            <button disabled={busy} onClick={() => window.confirm("Reset the password? The old one stops working straight away.") && run(() => api.ptwhLoginReset(worker.id), setCreds)} className={`${btnCls} bg-brand text-white`}>Reset password</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
