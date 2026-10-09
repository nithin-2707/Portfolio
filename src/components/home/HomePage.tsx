import type { ReactNode } from "react";
import { Launch } from "@/components/launch/Launch";
import { RouteNav } from "@/components/nav/RouteNav";
import { RouteProfile } from "@/components/routeprofile/RouteProfile";
import { Profile } from "@/components/profile/Profile";
import { Stages } from "@/components/stages/Stages";
import { ServicePark } from "@/components/servicepark/ServicePark";
import { Builds } from "@/components/builds/Builds";
import { SideRoads } from "@/components/sideroads/SideRoads";
import { Gearbox } from "@/components/gearbox/Gearbox";
import { Licences } from "@/components/licences/Licences";
import { Finish } from "@/components/finish/Finish";
import { Footer } from "@/components/footer/Footer";
import { RouteCursor } from "@/components/cursor/RouteCursor";
import { RouteLegs } from "@/components/route/RouteLegs";

/**
 * The whole route, in order. The hero is passed in so the hero variants can be compared on the same page
 * (`/` and the noindex `/preview/*` routes); once one is chosen, page.tsx renders it and the previews go.
 */
export function HomePage({ hero }: { hero: ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        Skip to content
      </a>
      <Launch />
      <RouteNav />
      <main id="main">
        {hero}
        {/* the route so far: the whole history under the name, before the details */}
        <RouteProfile />
        <Profile />
        <Stages />
        <ServicePark />
        <Builds />
        <SideRoads />
        <Gearbox />
        <Licences />
        <Finish />
      </main>
      <Footer />
      <RouteLegs />
      <RouteCursor />
    </>
  );
}
