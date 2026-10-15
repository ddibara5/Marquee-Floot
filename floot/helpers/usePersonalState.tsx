import { useQuery } from "@tanstack/react-query";
import { getPersonalState } from "../endpoints/personal-state_GET.schema";

export const usePersonalState = () => useQuery({
  queryKey:["marquee","personal-state"],
  queryFn:getPersonalState,
  retry:false,
});