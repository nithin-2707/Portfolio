import { person } from "@/content/site";

/** The hero's small printed pieces: the name lines and the place. */

export const NAME_LINES = [person.givenName, person.familyName] as const;
export const PLACE = `${person.location.split(",")[0]}, IN`;
