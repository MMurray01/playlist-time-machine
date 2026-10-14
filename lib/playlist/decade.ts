export interface DecadeTheme {
  decade: number
  label: string
  ink: string
  wash: string
  stripe: string
}

const THEMES: DecadeTheme[] = [
  { decade: 1960, label: "1960s", ink: "#0f3d3e", wash: "#e5f3f2", stripe: "#0f3d3e" },
  { decade: 1970, label: "1970s", ink: "#7c2d12", wash: "#fff1e6", stripe: "#7c2d12" },
  { decade: 1980, label: "1980s", ink: "#831843", wash: "#fde7f1", stripe: "#831843" },
  { decade: 1990, label: "1990s", ink: "#4c1d95", wash: "#f3e8ff", stripe: "#4c1d95" },
  { decade: 2000, label: "2000s", ink: "#1e3a8a", wash: "#e7eeff", stripe: "#1e3a8a" },
  { decade: 2010, label: "2010s", ink: "#134e4a", wash: "#e5f6f3", stripe: "#134e4a" },
  { decade: 2020, label: "2020s", ink: "#7c2d12", wash: "#ffedd5", stripe: "#7c2d12" },
]

export function decadeOf(year: number): number {
  return Math.floor(year / 10) * 10
}

export function themeForYear(year: number): DecadeTheme {
  const decade = decadeOf(year)
  return (
    THEMES.find((theme) => theme.decade === decade) ?? {
      decade,
      label: `${decade}s`,
      ink: "#3f2a22",
      wash: "#f6efe6",
      stripe: "#6e1e34",
    }
  )
}
