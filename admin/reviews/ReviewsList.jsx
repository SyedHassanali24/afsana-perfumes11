import { useEffect, useState } from "react";
import Card from "../components/Card";
import Button from "../components/Button";
import Drawer from "../components/Drawer";
import { Input } from "../components/FormFields";
import DataTable from "../components/DataTable";
import StatusPill from "../components/StatusPill";
import useApi from "../../src/hooks/useApi";
import useDebounce from "../../src/hooks/useDebounce";
import { useAuth } from "../../src/auth/AuthContext";
import { reviewsApi } from "../../src/services";

// Route: /admin/reviews (reviews.view). Approve / Feature / Reject need reviews.approve.
const LIMIT = 20;
const TABS = ["Pending", "Approved", "Featured", "Rejected"];
const TONE = { Pending: "warning", Approved: "success", Featured: "gold", Rejected: "danger" };
const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);
const day = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");

export default function ReviewsList() {
  const { can } = useAuth();
  const [status, setStatus] = useState("Pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null); // the review shown in the drawer
  const [busy, setBusy] = useState("");
  const [problem, setProblem] = useState("");
  const q = useDebounce(search);
  const { data, loading, error, reload } = useApi(() => reviewsApi.adminList({ status, q, page, limit: LIMIT }), [status, q, page]);
  const rows = (data?.reviews || []).map((r) => ({ ...r, id: r._id }));
  const pg = data?.pagination; const counts = data?.counts;

  useEffect(() => { if (pg && pg.pages >= 1 && page > pg.pages) setPage(pg.pages); }, [pg, page]);
  useEffect(() => { setProblem(""); }, [open?._id]);

  const move = async (to) => {
    setBusy(to); setProblem("");
    try { await reviewsApi.setStatus(open._id, to); setOpen(null); await reload(); }
    catch (e) { setProblem(e.message || "Could not change the review."); }
    finally { setBusy(""); }
  };

  const columns = [
    { key: "product", header: "Perfume", render: (r) => r.product.name },
    { key: "customerName", header: "Customer" },
    { key: "rating", header: "Rating", render: (r) => <span className="text-[#748e40]" title={`${r.rating} / 5`}>{stars(r.rating)}</span> },
    { key: "text", header: "Review", render: (r) => <span className="text-[#182308]-muted">{(r.title || r.text || "—").slice(0, 60)}{(r.title || r.text || "").length > 60 ? "…" : ""}</span> },
    { key: "createdAt", header: "Date", align: "right", render: (r) => day(r.createdAt) },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} tone={TONE[r.status]} /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-[#182308]">Reviews</h1>
        <p className="text-sm text-[#182308]-muted mt-1">Only buyers whose order was delivered can write one. Approved and featured reviews appear on the product page.</p>
      </div>
      <Card padded={false}>
        <div className="space-y-3 p-5 border-b border-[#263e0e]/10">
          <Input placeholder="Search perfume, customer or review text…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Search reviews" />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Review status">
            {TABS.map((t) => (
              <button key={t} type="button" aria-pressed={status === t} onClick={() => { setStatus(t); setPage(1); }} className={`px-3 py-1.5 rounded-sm text-xs border ${status === t ? "border-gold text-[#182308]" : "border-[#263e0e]/10 text-[#182308]-muted"}`}>
                {t}{counts ? ` (${counts[t] ?? 0})` : ""}
              </button>
            ))}
          </div>
        </div>
        <div className="p-5">
          {error ? (
            <div className="py-10 text-center space-y-3"><p className="text-sm text-[#9b3f3f]">{error.message}</p><Button variant="secondary" onClick={reload}>Try again</Button></div>
          ) : (
            <DataTable loading={loading} rows={rows} columns={columns} onRowClick={(r) => setOpen(r)} emptyMessage={status === "Pending" ? "Nothing waiting for approval." : "No reviews here."}
              pagination={pg && { page: pg.page, totalPages: pg.pages, onPageChange: setPage }} />
          )}
        </div>
      </Card>

      <Drawer open={Boolean(open)} onClose={() => setOpen(null)} size="md" title="Review" footer={<Button variant="secondary" onClick={() => setOpen(null)}>Close</Button>}>
        {open && (
          <div className="space-y-5">
            <div className="space-y-1 text-sm">
              <p className="text-[#182308]">{open.product.name}</p>
              <p className="text-[#748e40] text-lg" aria-label={`${open.rating} out of 5`}>{stars(open.rating)}</p>
              <p className="text-xs text-[#182308]-muted">{open.customerName} · {day(open.createdAt)} · <StatusPill status={open.status} tone={TONE[open.status]} /></p>
            </div>
            {open.title && <p className="text-sm text-[#182308]">{open.title}</p>}
            <p className="text-sm text-[#182308]-muted whitespace-pre-wrap">{open.text || "No written text, only stars."}</p>
            {problem && <p role="alert" className="text-sm text-[#9b3f3f]">{problem}</p>}
            {can("reviews.approve") ? (
              <div className="flex flex-wrap gap-2">
                {open.status !== "Approved" && <Button size="sm" onClick={() => move("Approved")} disabled={Boolean(busy)}>{busy === "Approved" ? "Saving…" : "Approve"}</Button>}
                {open.status !== "Featured" && <Button size="sm" variant="secondary" onClick={() => move("Featured")} disabled={Boolean(busy)}>{busy === "Featured" ? "Saving…" : "Feature"}</Button>}
                {open.status !== "Rejected" && <Button size="sm" variant="danger" onClick={() => move("Rejected")} disabled={Boolean(busy)}>{busy === "Rejected" ? "Saving…" : "Reject"}</Button>}
              </div>
            ) : <p className="text-sm text-[#182308]-muted">You do not have permission to approve or reject reviews.</p>}
          </div>
        )}
      </Drawer>
    </div>
  );
}
