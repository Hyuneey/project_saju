"use client";

import type { CalculateSajuResult } from "@project-saju/manse-engine";
import { FormEvent, useState } from "react";

type FormState = {
  calendarType: "solar" | "lunar";
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  lunarLeapMonth: boolean;
  timezone: string;
  gender: "male" | "female" | "unknown";
  dayBoundaryPolicy: "midnight" | "early_zi" | "split_zi";
  solarTimePolicy: "civil_time" | "mean_solar_time" | "true_solar_time";
};

const initialForm: FormState = {
  calendarType: "solar",
  birthDate: "2015-09-22",
  birthTime: "09:30",
  birthTimeUnknown: false,
  lunarLeapMonth: false,
  timezone: "Asia/Seoul",
  gender: "unknown",
  dayBoundaryPolicy: "midnight",
  solarTimePolicy: "civil_time"
};

export default function SajuDebugPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [result, setResult] = useState<CalculateSajuResult | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const payload = {
      calendarType: form.calendarType,
      birthDate: form.birthDate,
      birthTime: form.birthTimeUnknown || !form.birthTime ? undefined : form.birthTime,
      birthTimeUnknown: form.birthTimeUnknown,
      timezone: form.timezone,
      gender: form.gender,
      lunarLeapMonth: form.calendarType === "lunar" ? form.lunarLeapMonth : undefined,
      options: {
        yearBoundary: "lichun",
        monthBoundary: "solar_terms",
        dayBoundaryPolicy: form.dayBoundaryPolicy,
        solarTimePolicy: form.solarTimePolicy
      }
    };

    try {
      const response = await fetch("/api/saju/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json();

      if (!response.ok) {
        setError(json.error ?? json);
        return;
      }

      setResult(json);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : requestError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="debug-page">
      <header className="page-header">
        <h1>사주 계산 검증</h1>
        <span>Manse Engine v0.2.0</span>
      </header>

      <div className="workspace">
        <form className="debug-form" onSubmit={onSubmit}>
          <label>
            Calendar
            <select
              value={form.calendarType}
              onChange={(event) => setForm({ ...form, calendarType: event.target.value as FormState["calendarType"] })}
            >
              <option value="solar">Solar</option>
              <option value="lunar">Lunar</option>
            </select>
          </label>

          <label>
            Birth date
            <input
              type="date"
              value={form.birthDate}
              onChange={(event) => setForm({ ...form, birthDate: event.target.value })}
            />
          </label>

          <label>
            Birth time
            <input
              type="time"
              value={form.birthTime}
              disabled={form.birthTimeUnknown}
              onChange={(event) => setForm({ ...form, birthTime: event.target.value })}
            />
          </label>

          <label>
            Timezone
            <input
              value={form.timezone}
              onChange={(event) => setForm({ ...form, timezone: event.target.value })}
            />
          </label>

          <label>
            Gender
            <select
              value={form.gender}
              onChange={(event) => setForm({ ...form, gender: event.target.value as FormState["gender"] })}
            >
              <option value="unknown">Unknown</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>

          <label>
            Day boundary
            <select
              value={form.dayBoundaryPolicy}
              onChange={(event) =>
                setForm({ ...form, dayBoundaryPolicy: event.target.value as FormState["dayBoundaryPolicy"] })
              }
            >
              <option value="midnight">Midnight</option>
              <option value="early_zi">Early zi</option>
              <option value="split_zi">Split zi</option>
            </select>
          </label>

          <label>
            Solar time
            <select
              value={form.solarTimePolicy}
              onChange={(event) =>
                setForm({ ...form, solarTimePolicy: event.target.value as FormState["solarTimePolicy"] })
              }
            >
              <option value="civil_time">Civil time</option>
              <option value="mean_solar_time">Mean solar time</option>
              <option value="true_solar_time">True solar time</option>
            </select>
          </label>

          <div className="toggle-row">
            <label>
              <input
                type="checkbox"
                checked={form.birthTimeUnknown}
                onChange={(event) => setForm({ ...form, birthTimeUnknown: event.target.checked })}
              />
              Birth time unknown
            </label>

            <label>
              <input
                type="checkbox"
                checked={form.lunarLeapMonth}
                disabled={form.calendarType !== "lunar"}
                onChange={(event) => setForm({ ...form, lunarLeapMonth: event.target.checked })}
              />
              Lunar leap month
            </label>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Calculating" : "Calculate"}
          </button>
        </form>

        <section className="results">
          {error ? <JsonBlock title="Error" value={error} tone="error" /> : null}

          {result ? (
            <>
              <div className="pillar-grid">
                <Pillar label="Year" value={result.pillars.year} />
                <Pillar label="Month" value={result.pillars.month} />
                <Pillar label="Day" value={result.pillars.day} />
                <Pillar label="Hour" value={result.pillars.hour} />
              </div>
              <JsonBlock title="Basis" value={result.basis} />
              <JsonBlock title="Warnings" value={result.metadata.warnings} />
              <JsonBlock title="Metadata" value={result.metadata} />
            </>
          ) : (
            <div className="empty-state">No calculation result</div>
          )}
        </section>
      </div>
    </main>
  );
}

function Pillar({ label, value }: { label: string; value: CalculateSajuResult["pillars"]["year"] | null }) {
  return (
    <article className="pillar">
      <span>{label}</span>
      <strong>{value?.ganji ?? "null"}</strong>
      <small>{value ? `stem ${value.stemIndex} / branch ${value.branchIndex}` : "birth time unknown"}</small>
    </article>
  );
}

function JsonBlock({ title, value, tone }: { title: string; value: unknown; tone?: "error" }) {
  return (
    <section className={tone === "error" ? "json-block error" : "json-block"}>
      <h2>{title}</h2>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </section>
  );
}
