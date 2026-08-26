import { useSettingsStore } from "@/store/useSettingsStore";
import { useSettings } from "@/hooks/useSettings";
import { useStakingPresets } from "@/hooks/useStakingPresets";
import { Input, Select, Button } from "@/components/ui";
import { useState } from "react";
import { Eye, EyeOff, Save, Trash2 } from "lucide-react";
import { setToken } from "@/lib/stake-api/client";

const CURRENCY_OPTIONS = [
  { value: "NGN", label: "NGN — Nigerian Naira" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
];

const ODDS_OPTIONS = [
  { value: "decimal", label: "Decimal (2.50)" },
  { value: "fractional", label: "Fractional (3/2)" },
  { value: "american", label: "American (+150)" },
];

export default function SettingsPage() {
  const { apiToken, currency, oddsFormat, notifications, setApiToken, setCurrency, setOddsFormat, setNotifications } = useSettingsStore();
  const { updateSettings } = useSettings();
  const { presets, isLoading: presetsLoading } = useStakingPresets();
  const [tokenInput, setTokenInput] = useState(apiToken ?? "");
  const [showToken, setShowToken] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSaveToken = () => {
    const newToken = tokenInput || null;
    setApiToken(newToken);
    setToken(newToken);
    updateSettings({ apiToken: newToken });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-6 max-w-2xl">
      <section className="space-y-4">
        <div>
          <h2 className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider">API Connection</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Your Stake API token for live data and bet placement.</p>
        </div>
        <div className="bg-card border border-border rounded p-4 space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono text-muted-foreground">API Token</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showToken ? "text" : "password"}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Enter your Stake API token..."
                  className="w-full bg-secondary border border-border rounded px-2.5 py-1.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring pr-8"
                />
                <button type="button" onClick={() => setShowToken((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <Button variant="primary" size="sm" onClick={handleSaveToken} icon={<Save size={12} />}>
                {saved ? "Saved!" : "Save"}
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <div className={`w-2 h-2 rounded-full ${apiToken ? "bg-bet-won" : "bg-bet-cancelled"}`} />
            <span className="text-muted-foreground">{apiToken ? "Connected" : "Not connected"}</span>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider">Display Preferences</h2>
        <div className="bg-card border border-border rounded p-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Default Currency"
            options={CURRENCY_OPTIONS}
            value={currency}
            onChange={(v) => { setCurrency(v); updateSettings({ currency: v }); }}
          />
          <Select
            label="Odds Format"
            options={ODDS_OPTIONS}
            value={oddsFormat}
            onChange={(v) => { setOddsFormat(v as typeof oddsFormat); updateSettings({ oddsFormat: v as typeof oddsFormat }); }}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider">Notifications</h2>
        <div className="bg-card border border-border rounded p-4 space-y-3">
          {([
            { key: "betPlaced", label: "Bet placed confirmation" },
            { key: "betSettled", label: "Bet settled result" },
            { key: "oddsChanged", label: "Odds change alerts" },
          ] as const).map((n) => (
            <div key={n.key} className="flex items-center justify-between">
              <span className="text-xs font-mono text-foreground">{n.label}</span>
              <button
                type="button"
                onClick={() => {
                  const newVal = !notifications[n.key];
                  setNotifications({ [n.key]: newVal });
                  updateSettings({ notifications: { ...notifications, [n.key]: newVal } });
                }}
                className={`w-9 h-5 rounded-full transition-colors relative ${notifications[n.key] ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${notifications[n.key] ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider">Staking Presets</h2>
        <div className="bg-card border border-border rounded p-4 space-y-2">
          {presetsLoading ? (
            <p className="text-xs font-mono text-muted-foreground">Loading presets...</p>
          ) : presets.length === 0 ? (
            <p className="text-xs font-mono text-muted-foreground">No staking presets configured yet.</p>
          ) : (
            presets.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-xs font-mono text-foreground">{p.name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground capitalize">{p.mode} · {p.mode === "percentage" ? `${p.percentage}%` : p.mode === "kelly" ? `bankroll: ₦${p.bankroll?.toLocaleString("en-NG")}` : `₦${p.amount?.toLocaleString("en-NG")}`}</p>
                </div>
                <Button variant="ghost" size="sm">Edit</Button>
              </div>
            ))
          )}
          <Button variant="outline" size="sm" fullWidth>+ Add Preset</Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider text-bet-lost">Danger Zone</h2>
        <div className="bg-card border border-bet-lost/30 rounded p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-foreground">Clear all bet history</p>
              <p className="text-[10px] font-mono text-muted-foreground">This will permanently delete all local bet records.</p>
            </div>
            <Button variant="danger" size="sm" icon={<Trash2 size={12} />}>Clear</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
