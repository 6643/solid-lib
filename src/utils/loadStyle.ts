import { createSignal, createTrackedEffect, type Accessor } from "solid-js";

type StyleStatus = "idle" | "loading" | "loaded" | "error";

const styleRefCounts = new Map<string, { link: HTMLLinkElement; count: number }>();

export const loadStyle = (href: Accessor<string | null> | string | null): Accessor<StyleStatus> => {
    const [status, setStatus] = createSignal<StyleStatus>("idle");
    const styleHref = typeof href === "function" ? href : () => href;

    createTrackedEffect(() => {
        const currentHref = styleHref();
        if (!currentHref) {
            setStatus("idle");
            return;
        }

        let linkEntry = styleRefCounts.get(currentHref);
        let link: HTMLLinkElement;

        if (!linkEntry) {
            link = document.querySelector(`link[href="${currentHref}"]`) as HTMLLinkElement;

            if (!link) {
                link = document.createElement("link");
                link.href = currentHref;
                link.rel = "stylesheet";
                link.setAttribute("data-status", "loading");
                document.head.appendChild(link);
                setStatus("loading");
            } else {
                const existingStatus = link.getAttribute("data-status") as StyleStatus;
                if (existingStatus) setStatus(existingStatus);
            }
            styleRefCounts.set(currentHref, { link, count: 1 });
        } else {
            link = linkEntry.link;
            linkEntry.count++;
            styleRefCounts.set(currentHref, linkEntry);
            const existingStatus = link.getAttribute("data-status") as StyleStatus;
            if (existingStatus) setStatus(existingStatus);
        }

        const handleLoad = () => {
            link.setAttribute("data-status", "loaded");
            setStatus("loaded");
        };

        const handleError = () => {
            link.setAttribute("data-status", "error");
            setStatus("error");
        };

        link.addEventListener("load", handleLoad);
        link.addEventListener("error", handleError);

        return () => {
            link.removeEventListener("load", handleLoad);
            link.removeEventListener("error", handleError);

            const cleanupLinkEntry = styleRefCounts.get(currentHref);
            if (!cleanupLinkEntry) return;

            cleanupLinkEntry.count--;
            if (cleanupLinkEntry.count <= 0) {
                cleanupLinkEntry.link.remove();
                styleRefCounts.delete(currentHref);
                return;
            }

            styleRefCounts.set(currentHref, cleanupLinkEntry);
        };
    });

    return status;
};
