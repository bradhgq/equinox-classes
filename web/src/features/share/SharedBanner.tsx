import { Banner, BannerAction } from "../../components/Banner/Banner.tsx";
import { Icon } from "../../components/Icon/Icon.tsx";
import { useFilters } from "../../state/FiltersContext.tsx";

/**
 * Shown after opening someone's share link (handoff §7). KEEP saves it as your
 * filters; CLEAR goes back to yours. A first visit adopts the link, so only ✕.
 */
export function SharedBanner() {
  const { shared, keepShared, clearShared, dismissShared } = useFilters();
  if (shared.mode === "none") return null;
  const note =
    shared.dropped > 0
      ? `${shared.dropped} ${shared.dropped === 1 ? "item" : "items"} in this link ${shared.dropped === 1 ? "isn't" : "aren't"} on the schedule anymore.`
      : undefined;
  return (
    <Banner
      note={note}
      actions={
        shared.mode === "temporary" ? (
          <>
            <BannerAction onClick={keepShared} label="Keep this search as my filters">
              Keep
            </BannerAction>
            <BannerAction onClick={clearShared} label="Clear the shared search and go back to my filters">
              Clear
            </BannerAction>
          </>
        ) : (
          <BannerAction onClick={dismissShared} label="Dismiss">
            <Icon name="close" size={20} />
          </BannerAction>
        )
      }
    >
      Showing a shared search
    </Banner>
  );
}
