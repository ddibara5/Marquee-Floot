import { useQuery } from "@tanstack/react-query";
import { getTitleEpisodes } from "../endpoints/title-episodes_GET.schema";

export const useTitleEpisodes = (titleId: number | null) =>
  useQuery({
    queryKey: ["marquee", "title-episodes", titleId],
    queryFn: () => getTitleEpisodes({ titleId: titleId as number }),
    enabled: titleId !== null,
    retry: false,
  });