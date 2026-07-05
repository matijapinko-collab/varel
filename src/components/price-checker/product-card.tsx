"use client";

import Image from "next/image";
import { Star, Truck, Check } from "lucide-react";
import type { PriceCheckerResult } from "@/lib/price-checker/types";

function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * A single Amazon.de product result. Every optional field is only rendered when
 * the API actually returned it — nothing is faked.
 */
export function ProductCard({
  product,
  position,
  onSelect,
}: {
  product: PriceCheckerResult;
  position: number;
  onSelect: (product: PriceCheckerResult, position: number) => void;
}) {
  const showOld =
    product.oldPrice != null && product.price != null && product.oldPrice > product.price;

  return (
    <div className="group flex flex-col overflow-hidden rounded-card border border-border bg-card transition-shadow hover:shadow-md">
      <div className="relative flex h-44 items-center justify-center border-b border-border bg-white p-4">
        {position === 0 && (
          <span className="absolute left-2 top-2 z-10 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
            Best match
          </span>
        )}
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.title}
            width={180}
            height={180}
            className="max-h-full w-auto object-contain mix-blend-multiply"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted">
            No image
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2">
          <span className="rounded bg-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            Amazon.de
          </span>
          {product.isPrime && (
            <span className="inline-flex items-center gap-0.5 rounded bg-[#00A8E1]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#00A8E1]">
              <Check size={10} /> Prime
            </span>
          )}
        </div>

        <h3 className="line-clamp-2 text-sm font-medium leading-snug" title={product.title}>
          {product.title}
        </h3>

        {product.rating != null && (
          <div className="flex items-center gap-1 text-xs text-muted">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            <span className="font-medium text-foreground">{product.rating.toFixed(1)}</span>
            {product.reviewCount != null && (
              <span>({product.reviewCount.toLocaleString("de-DE")})</span>
            )}
          </div>
        )}

        <div className="mt-auto">
          {product.price != null && product.currency ? (
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold">{formatPrice(product.price, product.currency)}</span>
              {showOld && (
                <span className="text-sm text-muted line-through">
                  {formatPrice(product.oldPrice!, product.currency)}
                </span>
              )}
              {product.discountPercent != null && product.discountPercent > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">
                  -{product.discountPercent}%
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-muted">See price on Amazon</span>
          )}

          {product.availability && (
            <p className="mt-1 text-xs text-muted">{product.availability}</p>
          )}
          {product.deliveryInfo && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
              <Truck size={12} /> {product.deliveryInfo}
            </p>
          )}

          <a
            href={product.affiliateUrl}
            target="_blank"
            rel="nofollow sponsored noopener"
            onClick={() => onSelect(product, position)}
            className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            View on Amazon
          </a>
        </div>
      </div>
    </div>
  );
}
