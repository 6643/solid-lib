import { createEffect, createSignal, type Accessor } from "solid-js";

type StyleStatus = 'idle' | 'loading' | 'loaded' | 'error';

// Global map to store stylesheet references and their counts
const styleRefCounts = new Map<string, { link: HTMLLinkElement, count: number }>();

export const loadStyle = (href: Accessor<string | null> | string | null): Accessor<StyleStatus> => {
    const [status, setStatus] = createSignal<StyleStatus>('idle');
    const styleHref = typeof href === 'function' ? href : () => href;

    createEffect(
        () => styleHref(),  // compute
        (currentHref) => {  // apply
            if (!currentHref) {
                setStatus('idle');
                return;
            }

            let linkEntry = styleRefCounts.get(currentHref);
            let link: HTMLLinkElement;

            if (!linkEntry) {
                // Check if the stylesheet link already exists in the DOM (e.g., pre-rendered or added by another means)
                link = document.querySelector(`link[href="${currentHref}"]`) as HTMLLinkElement;

                if (!link) {
                    // Create link tag
                    link = document.createElement('link');
                    link.href = currentHref;
                    link.rel = 'stylesheet';
                    link.setAttribute('data-status', 'loading'); // Custom attribute to track status
                    document.head.appendChild(link);
                    setStatus('loading');
                } else {
                    // If link exists in DOM but not in our map, initialize its status
                    const existingStatus = link.getAttribute('data-status') as StyleStatus;
                    if (existingStatus) {
                        setStatus(existingStatus);
                    }
                }
                styleRefCounts.set(currentHref, { link, count: 1 });
            } else {
                // Link already managed by the hook, increment count
                link = linkEntry.link;
                linkEntry.count++;
                styleRefCounts.set(currentHref, linkEntry); // Update map with new count
                // Set status based on existing link's status
                const existingStatus = link.getAttribute('data-status') as StyleStatus;
                if (existingStatus) {
                    setStatus(existingStatus);
                }
            }

            const handleLoad = () => {
                link.setAttribute('data-status', 'loaded');
                setStatus('loaded');
            };

            const handleError = () => {
                link.setAttribute('data-status', 'error');
                setStatus('error');
            };

            link.addEventListener('load', handleLoad);
            link.addEventListener('error', handleError);

            return () => {
                link.removeEventListener('load', handleLoad);
                link.removeEventListener('error', handleError);

                const cleanupLinkEntry = styleRefCounts.get(currentHref);
                if (cleanupLinkEntry) {
                    cleanupLinkEntry.count--;
                    if (cleanupLinkEntry.count <= 0) {
                        cleanupLinkEntry.link.remove();
                        styleRefCounts.delete(currentHref);
                    } else {
                        styleRefCounts.set(currentHref, cleanupLinkEntry);
                    }
                }
            };
        }
    );

    return status;
};
