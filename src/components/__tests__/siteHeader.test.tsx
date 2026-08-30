import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";

const mockAuth = vi.fn();
const currentPath = { value: "/" };

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mockAuth() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signOut: vi.fn() } },
}));
vi.mock("@/assets/logo.png", () => ({ default: "logo.png" }));
vi.mock("@/lib/router-compat", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...rest }: { children: ReactNode; to: string }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  useRouterState: ({ select }: { select: (s: unknown) => unknown }) =>
    select({ location: { pathname: currentPath.value } }),
}));
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const ROUTES = ["/", "/about", "/pricing", "/contact", "/terms", "/privacy"];

/** All header actions live in the hamburger dropdown at every screen size. */
function openMenu() {
  fireEvent.click(screen.getByRole("button", { name: /menu/i }));
}

describe("SiteHeader session-aware menus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentPath.value = "/";
  });

  it("keeps all navigation behind the hamburger dropdown by default", () => {
    mockAuth.mockReturnValue({ user: null, loading: false });
    render(<SiteHeader />);

    expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "About" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign In" })).not.toBeInTheDocument();
  });

  it("shows a neutral loading placeholder while the session resolves", () => {
    mockAuth.mockReturnValue({ user: null, loading: true });
    render(<SiteHeader />);
    openMenu();

    expect(screen.getByTestId("header-auth-loading")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign In" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Sign Out/ })).not.toBeInTheDocument();
  });

  it.each(ROUTES)("shows signed-out menu on %s", (path) => {
    currentPath.value = path;
    mockAuth.mockReturnValue({ user: null, loading: false });
    render(<SiteHeader />);
    openMenu();

    expect(screen.getByRole("link", { name: "About" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pricing" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Get Started" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Sign Out/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /New Debate/ })).not.toBeInTheDocument();
  });

  it.each(ROUTES)("shows signed-in menu on %s", (path) => {
    currentPath.value = path;
    mockAuth.mockReturnValue({ user: { id: "u1", email: "a@b.com" }, loading: false });
    render(<SiteHeader />);
    openMenu();

    expect(screen.getByRole("link", { name: "About" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pricing" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dashboard/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New Debate/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Leaderboard/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign Out/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign In" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Get Started" })).not.toBeInTheDocument();
  });

  it("marks the active public link with aria-current", () => {
    currentPath.value = "/pricing";
    mockAuth.mockReturnValue({ user: null, loading: false });
    render(<SiteHeader />);
    openMenu();

    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute("aria-current", "page");
  });
});

describe("SiteFooter legal links", () => {
  it("renders Contact, Terms and Privacy for any visitor", () => {
    render(<SiteFooter />);

    expect(screen.getByRole("link", { name: "Contact Us" })).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("link", { name: /Terms/ })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
  });
});
