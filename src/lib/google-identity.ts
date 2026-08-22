export type GoogleCredentialResponse = {
  credential?: string;
};

export type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (input: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        auto_select?: boolean;
        ux_mode?: "popup" | "redirect";
      }) => void;
      renderButton: (
        element: HTMLElement,
        options: Record<string, unknown>,
      ) => void;
    };
  };
};

const googleIdentityScriptUrl = "https://accounts.google.com/gsi/client";
let googleIdentityLoad: Promise<GoogleIdentity> | null = null;

function loadedGoogleIdentity() {
  return (window as typeof window & { google?: GoogleIdentity }).google;
}

export function loadGoogleIdentity() {
  const loaded = loadedGoogleIdentity();
  if (loaded) return Promise.resolve(loaded);
  if (googleIdentityLoad) return googleIdentityLoad;

  googleIdentityLoad = new Promise<GoogleIdentity>((resolve, reject) => {
    let settled = false;
    const scripts = Array.from(
      document.querySelectorAll<HTMLScriptElement>(
        `script[src^="${googleIdentityScriptUrl}"]`,
      ),
    );
    scripts
      .filter((candidate) => candidate.dataset.googleIdentityState === "failed")
      .forEach((candidate) => candidate.remove());
    let script = scripts.find(
      (candidate) => candidate.dataset.googleIdentityState !== "failed",
    );

    const cleanUp = () => {
      window.clearTimeout(timeout);
      script?.removeEventListener("load", handleLoad);
      script?.removeEventListener("error", handleError);
    };
    const succeed = () => {
      if (settled) return;
      const identity = loadedGoogleIdentity();
      if (!identity) {
        fail(new Error("Google Identity Services did not initialize."));
        return;
      }
      settled = true;
      if (script) script.dataset.googleIdentityState = "loaded";
      cleanUp();
      resolve(identity);
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      if (script) script.dataset.googleIdentityState = "failed";
      cleanUp();
      reject(error);
    };
    function handleLoad() {
      succeed();
    }
    function handleError() {
      fail(new Error("Google Identity Services could not be loaded."));
    }

    const timeout = window.setTimeout(
      () => fail(new Error("Google Identity Services timed out.")),
      12_000,
    );

    if (!script) {
      script = document.createElement("script");
      script.src = googleIdentityScriptUrl;
      script.async = true;
      script.defer = true;
      script.dataset.customerGoogleSignin = "true";
      script.dataset.googleIdentityState = "loading";
    }
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });

    if (!script.isConnected) document.head.appendChild(script);
    else if (script.dataset.googleIdentityState === "loaded") succeed();
  }).catch((error) => {
    googleIdentityLoad = null;
    throw error;
  });

  return googleIdentityLoad;
}
