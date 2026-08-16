export interface Location {
  name: string;
  flag: string; // ISO country code (lowercase)
  type: "country" | "state";
}