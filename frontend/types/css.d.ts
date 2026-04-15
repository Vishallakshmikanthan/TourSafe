// Allow importing CSS files directly (used by Leaflet)
declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}
