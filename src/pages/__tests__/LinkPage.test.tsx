import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LinkPage from "../LinkPage";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Mock Layout Components
vi.mock("@/components/layout/PublicHeader", () => ({
    PublicHeader: () => <div data-testid="public-header">Header</div>,
}));

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        from: vi.fn(),
    },
}));

const mockLinkPageData = {
    id: "page-1",
    championship_id: "champ-1",
    slug: "test-event",
    theme_color: "#FF5733",
    banner_url: "http://example.com/banner.jpg",
    banner_alt: "AntCamp Championship", // Ensure alt matches what code expects (linkPage?.banner_alt || championship.name)
};

const mockChampionshipData = {
    id: "champ-1",
    name: "AntCamp Championship",
    date: "2024-12-25",
    location: "São Paulo, SP",
    organizer_id: "org-1",
};

const mockOrganizerData = {
    full_name: "AntCamp Org",
};

const mockButtonsData = [
    {
        id: 1,
        label: "Inscreva-se",
        url: "http://register.com",
        button_type: "registration",
        icon: "Users",
        is_active: true,
        order_index: 0,
        link_page_id: "page-1",
    },
];

describe("LinkPage Component", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        (supabase.from as any).mockImplementation((table: string) => {
            // console.log("Supabase Mock Called with table:", table);
            if (table === "link_pages") {
                return {
                    select: () => ({
                        eq: () => ({
                            single: () => Promise.resolve({ data: mockLinkPageData, error: null }),
                        }),
                    }),
                };
            }
            if (table === "championships") {
                return {
                    select: () => ({
                        eq: () => ({
                            single: () => Promise.resolve({ data: mockChampionshipData, error: null }),
                        }),
                    }),
                };
            }
            if (table === "profiles") {
                return {
                    select: () => ({
                        eq: () => ({
                            maybeSingle: () => Promise.resolve({ data: mockOrganizerData, error: null }),
                        }),
                    }),
                };
            }
            if (table === "link_buttons") {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                order: () => Promise.resolve({ data: mockButtonsData, error: null }),
                            }),
                        }),
                    }),
                };
            }
            return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }) };
        });
    });

    it("renders the page with correct data", async () => {
        render(
            <MemoryRouter initialEntries={["/link/test-event"]}>
                <Routes>
                    <Route path="/link/:slug" element={<LinkPage />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            // Check for image alt text since banner_url is present
            // logic: alt={linkPage?.banner_alt || championship.name}
            // mockLinkPageData has banner_alt="AntCamp Championship"
            const img = screen.getByAltText("AntCamp Championship");
            expect(img).toBeInTheDocument();
            expect(img).toHaveAttribute("src", "http://example.com/banner.jpg");

            expect(screen.getByText("São Paulo, SP")).toBeInTheDocument();
            expect(screen.getByText("Inscreva-se")).toBeInTheDocument();
        });
    });

    it("applies correct styles to buttons", async () => {
        render(
            <MemoryRouter initialEntries={["/link/test-event"]}>
                <Routes>
                    <Route path="/link/:slug" element={<LinkPage />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            const btn = screen.getByText("Inscreva-se").closest("button");
            expect(btn).toHaveClass("text-sm");
            expect(btn).toHaveClass("px-4");
            expect(btn).toHaveClass("rounded");
        });
    });
});
