import { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Clock3,
  RefreshCw,
  Search,
  Star,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { commerceApi } from "@/lib/commerce-api";
import {
  DetailDrawer,
  MetricStrip,
  PaginationControls,
  StatusBadge,
  WorkspaceState,
  facetCount,
  formatDate,
  initials,
  toQuery,
  useClampedPage,
  useDebouncedValue,
  useLiveResource,
} from "./shared";
import type {
  ReviewDetail,
  ReviewListItem,
  ReviewListResponse,
  ReviewStatus,
} from "./types";

const LIMIT = 20;

export function ReviewsWorkspace() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | ReviewStatus>("PENDING");
  const [rating, setRating] = useState("");
  const [verified, setVerified] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moderating, setModerating] = useState<string | null>(null);
  const moderationLock = useRef(false);
  const statusRef = useRef(status);
  statusRef.current = status;
  const debouncedSearch = useDebouncedValue(search);
  const url = useMemo(
    () =>
      `/api/v1/admin/reviews${toQuery({
        search: debouncedSearch,
        status,
        rating,
        verified,
        page,
        limit: LIMIT,
      })}`,
    [debouncedSearch, status, rating, verified, page],
  );
  const resource = useLiveResource<ReviewListResponse>(url);
  const data = resource.data;
  useClampedPage({
    page,
    pagination: data?.pagination,
    itemCount: data?.items.length || 0,
    ready: resource.resolvedUrl === url,
    onPage: setPage,
  });
  const filtersApplied = Boolean(search || status || rating || verified);
  const metrics = [
    data?.pagination.total !== undefined
      ? {
          label: status ? `${status.toLowerCase()} reviews` : "All reviews",
          value: data.pagination.total,
          icon: Star,
        }
      : null,
    facetCount(data?.facets, "statuses", "PENDING") !== undefined
      ? {
          label: "Awaiting review",
          value: facetCount(data?.facets, "statuses", "PENDING"),
          icon: Clock3,
        }
      : null,
    facetCount(data?.facets, "statuses", "APPROVED") !== undefined
      ? {
          label: "Published",
          value: facetCount(data?.facets, "statuses", "APPROVED"),
          icon: CheckCircle2,
        }
      : null,
    facetCount(data?.facets, "verified", "true") !== undefined
      ? {
          label: "Verified purchases",
          value: facetCount(data?.facets, "verified", "true"),
          icon: BadgeCheck,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  const moderate = async (id: string, nextStatus: "APPROVED" | "REJECTED") => {
    if (moderationLock.current) return null;
    moderationLock.current = true;
    setModerating(id);
    try {
      const updated = await commerceApi<ReviewDetail>(
        `/api/v1/admin/reviews/${encodeURIComponent(id)}`,
        { method: "PATCH", body: JSON.stringify({ status: nextStatus }) },
      );
      resource.setData((current) => {
        if (!current) return current;
        const existing = current.items.find((item) => item.id === id);
        if (!existing) return current;
        const remainsVisible =
          !statusRef.current || statusRef.current === updated.status;
        const items = remainsVisible
          ? current.items.map((item) => (item.id === id ? updated : item))
          : current.items.filter((item) => item.id !== id);
        const total = Math.max(
          0,
          current.pagination.total - (remainsVisible ? 0 : 1),
        );
        const totalPages = Math.max(
          1,
          Math.ceil(total / current.pagination.limit),
        );
        const statusCounts = new Map(
          (current.facets.statuses || []).map((facet) => [
            facet.value,
            facet.count,
          ]),
        );
        if (existing.status !== updated.status) {
          statusCounts.set(
            existing.status,
            Math.max(0, (statusCounts.get(existing.status) || 0) - 1),
          );
          statusCounts.set(
            updated.status,
            (statusCounts.get(updated.status) || 0) + 1,
          );
        }
        return {
          ...current,
          items,
          pagination: {
            ...current.pagination,
            total,
            totalPages,
            hasNextPage: current.pagination.page < totalPages,
            hasPreviousPage: current.pagination.page > 1,
          },
          facets: {
            ...current.facets,
            statuses: [...statusCounts]
              .filter(([, count]) => count > 0)
              .map(([value, count]) => ({ value, count })),
          },
        };
      });
      resource.reload();
      toast.success(
        nextStatus === "APPROVED" ? "Review published" : "Review rejected",
      );
      return updated;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The review status could not be changed",
      );
      return null;
    } finally {
      moderationLock.current = false;
      setModerating(null);
    }
  };

  return (
    <div className="ops-workspace">
      <div className="ops-heading">
        <div>
          <p className="portal-eyebrow">Store reputation</p>
          <h2>Reviews</h2>
          <span>
            Publish useful feedback and keep inappropriate content hidden.
          </span>
        </div>
        <button
          className="secondary"
          type="button"
          onClick={resource.reload}
          disabled={resource.loading || resource.refreshing}
        >
          <RefreshCw
            className={resource.loading || resource.refreshing ? "spin" : ""}
          />{" "}
          {resource.refreshing ? "Updating…" : "Refresh"}
        </button>
      </div>

      <MetricStrip items={metrics} />

      <section className="ops-panel">
        <div className="ops-toolbar">
          <label className="ops-search">
            <Search />
            <span className="sr-only">Search reviews</span>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search customer, product or review"
            />
          </label>
          <label>
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as "" | ReviewStatus);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="PENDING">Awaiting review</option>
              <option value="APPROVED">Published</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </label>
          <label>
            <span>Rating</span>
            <select
              value={rating}
              onChange={(event) => {
                setRating(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Any rating</option>
              {[5, 4, 3, 2, 1].map((value) => (
                <option value={value} key={value}>
                  {value} stars
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Purchase</span>
            <select
              value={verified}
              onChange={(event) => {
                setVerified(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All reviews</option>
              <option value="true">Verified only</option>
              <option value="false">Unverified only</option>
            </select>
          </label>
        </div>

        <WorkspaceState
          loading={resource.loading && !data}
          error={resource.error}
          empty={!data?.items.length}
          emptyTitle={filtersApplied ? "No matching reviews" : "No reviews yet"}
          emptyBody={
            filtersApplied
              ? "Try another search or filter."
              : "Submitted customer reviews will appear here."
          }
          onRetry={resource.reload}
        >
          <div className="ops-review-list">
            {data?.items.map((review) => (
              <ReviewCard
                review={review}
                busy={Boolean(moderating)}
                onOpen={() => setSelectedId(review.id)}
                onModerate={(nextStatus) =>
                  void moderate(review.id, nextStatus)
                }
                key={review.id}
              />
            ))}
          </div>
          <PaginationControls pagination={data?.pagination} onPage={setPage} />
        </WorkspaceState>
      </section>

      <DetailDrawer
        open={Boolean(selectedId)}
        title="Review details"
        subtitle="Customer feedback and moderation"
        onClose={() => setSelectedId(null)}
      >
        {selectedId && (
          <ReviewDetailContent
            reviewId={selectedId}
            busy={Boolean(moderating)}
            onModerate={(nextStatus) => moderate(selectedId, nextStatus)}
          />
        )}
      </DetailDrawer>
    </div>
  );
}

function Rating({ value }: { value: number }) {
  return (
    <span className="ops-stars" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          aria-hidden="true"
          className={star <= value ? "filled" : ""}
          key={star}
        />
      ))}
    </span>
  );
}

function ReviewCard({
  review,
  busy,
  onOpen,
  onModerate,
}: {
  review: ReviewListItem;
  busy: boolean;
  onOpen: () => void;
  onModerate: (status: "APPROVED" | "REJECTED") => void;
}) {
  return (
    <article>
      <button className="ops-review-main" type="button" onClick={onOpen}>
        <div className="ops-review-product">
          {review.product?.thumbnail ? (
            <img src={review.product.thumbnail} alt="" />
          ) : (
            <i>{review.product?.name?.slice(0, 1).toUpperCase() || "P"}</i>
          )}
          <span>
            <small>Product</small>
            <b>{review.product?.name || "Deleted product"}</b>
          </span>
        </div>
        <div className="ops-review-copy">
          <div>
            <Rating value={review.rating} />
            {review.verified && (
              <span className="ops-verified">
                <BadgeCheck /> Verified purchase
              </span>
            )}
          </div>
          {review.title && <h3>{review.title}</h3>}
          <p>{review.body}</p>
          <span className="ops-review-author">
            <i>{initials(review.customer?.name)}</i>
            <b>{review.customer?.name || "Deleted customer"}</b>
            <small>{formatDate(review.createdAt)}</small>
          </span>
        </div>
        <ChevronRight />
      </button>
      <div className="ops-review-actions">
        <StatusBadge value={review.status} />
        {review.status !== "APPROVED" && (
          <button
            type="button"
            onClick={() => onModerate("APPROVED")}
            disabled={busy}
          >
            <CheckCircle2 /> Publish
          </button>
        )}
        {review.status !== "REJECTED" && (
          <button
            className="danger"
            type="button"
            onClick={() => onModerate("REJECTED")}
            disabled={busy}
          >
            <XCircle /> Reject
          </button>
        )}
      </div>
    </article>
  );
}

function ReviewDetailContent({
  reviewId,
  busy,
  onModerate,
}: {
  reviewId: string;
  busy: boolean;
  onModerate: (status: "APPROVED" | "REJECTED") => Promise<ReviewDetail | null>;
}) {
  const resource = useLiveResource<ReviewDetail>(
    `/api/v1/admin/reviews/${encodeURIComponent(reviewId)}`,
  );
  const review = resource.data;
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );
  const applyModeration = async (status: "APPROVED" | "REJECTED") => {
    const updated = await onModerate(status);
    if (updated && mounted.current) resource.setData(updated);
  };
  return (
    <WorkspaceState
      loading={resource.loading && !review}
      error={resource.error}
      empty={!review}
      emptyTitle="Review not found"
      emptyBody="This review may no longer be available."
      onRetry={resource.reload}
    >
      {review && (
        <div className="ops-detail-stack">
          <section className="ops-detail-card ops-review-detail">
            <div className="ops-section-head">
              <div>
                <Star />
                <span>
                  <h3>{review.product?.name || "Deleted product"}</h3>
                  <p>Submitted {formatDate(review.createdAt, true)}</p>
                </span>
              </div>
              <StatusBadge value={review.status} />
            </div>
            <Rating value={review.rating} />
            {review.title && <h4>{review.title}</h4>}
            <blockquote>{review.body}</blockquote>
            <div className="ops-reviewer">
              <i>{initials(review.customer?.name)}</i>
              <span>
                <b>{review.customer?.name || "Deleted customer"}</b>
                <small>
                  {review.customer?.email || "Customer identity removed"}
                </small>
              </span>
              {review.verified && (
                <span className="ops-verified">
                  <BadgeCheck /> Verified purchase
                </span>
              )}
            </div>
          </section>
          <section className="ops-detail-card ops-moderation-card">
            <div className="ops-section-head">
              <div>
                <BadgeCheck />
                <span>
                  <h3>Moderation</h3>
                  <p>Choose whether this review appears on the storefront.</p>
                </span>
              </div>
            </div>
            <div>
              {review.status !== "APPROVED" && (
                <button
                  className="primary"
                  type="button"
                  onClick={() => void applyModeration("APPROVED")}
                  disabled={busy}
                >
                  {busy ? <RefreshCw className="spin" /> : <CheckCircle2 />}{" "}
                  Publish review
                </button>
              )}
              {review.status !== "REJECTED" && (
                <button
                  className="secondary danger"
                  type="button"
                  onClick={() => void applyModeration("REJECTED")}
                  disabled={busy}
                >
                  <XCircle /> Reject review
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </WorkspaceState>
  );
}
