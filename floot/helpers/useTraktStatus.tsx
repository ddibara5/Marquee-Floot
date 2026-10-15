import { useQuery } from "@tanstack/react-query";
import { getTraktStatus } from "../endpoints/trakt-status_GET.schema";

export const useTraktStatus = () =>
  useQuery({
    queryKey: ["marquee", "trakt-status"],
    queryFn: () => getTraktStatus(),
    retry: false,
  });