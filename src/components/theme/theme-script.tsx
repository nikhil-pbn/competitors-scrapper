import { themeInitScript } from "@/components/theme/theme";

/**
 * Injects the render-blocking theme bootstrap as the first thing in the body so
 * the document paints in the correct theme with no flash. Server component — it
 * renders a static, build-time inline script and ships no client JS. The string
 * is trusted and constant, so dangerouslySetInnerHTML is safe here.
 */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />;
}
