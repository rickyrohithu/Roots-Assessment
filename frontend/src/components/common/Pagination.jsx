import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Pagination = ({ total, page, limit, onPageChange, itemLabel = 'tasks' }) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (total === 0) return null;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    const maxButtons = 5;

    let start = Math.max(1, page - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);

    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="pagination-bar">
      <div className="pagination-info">
        Showing <strong>{startItem}-{endItem}</strong> of <strong>{total}</strong> {itemLabel}
      </div>

      <div className="pagination-controls">
        <button
          type="button"
          className="page-nav-btn"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={`page-num-btn ${p === page ? 'active' : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}

        <button
          type="button"
          className="page-nav-btn"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
