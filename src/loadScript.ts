import { createEffect, createSignal, type Accessor } from "solid-js";
import { isServer } from "@solidjs/web";

type ScriptStatus = "idle" | "loading" | "loaded" | "error";

export const loadScript = (src: Accessor<string | null> | string | null): Accessor<ScriptStatus> => {
    const [status, setStatus] = createSignal<ScriptStatus>("idle");
    const scriptSrc = typeof src === "function" ? src : () => src;

    if (isServer) return status;

    createEffect(
        () => scriptSrc(),
        (currentSrc) => {
            if (!currentSrc) {
                setStatus("idle");
                return;
            }

            let script = document.querySelector(`script[src="${currentSrc}"]`) as HTMLScriptElement | null;

            if (!script) {
                script = document.createElement("script");
                script.src = currentSrc;
                script.async = true;
                script.setAttribute("data-status", "loading");
                document.head.appendChild(script);
                setStatus("loading");
            } else {
                const existingStatus = script.getAttribute("data-status") as ScriptStatus | null;
                if (existingStatus) setStatus(existingStatus);
            }

            const handleLoad = () => {
                script!.setAttribute("data-status", "loaded");
                setStatus("loaded");
            };

            const handleError = () => {
                script!.setAttribute("data-status", "error");
                setStatus("error");
            };

            script.addEventListener("load", handleLoad);
            script.addEventListener("error", handleError);

            return () => {
                script!.removeEventListener("load", handleLoad);
                script!.removeEventListener("error", handleError);
            };
        },
    );

    return status;
};
