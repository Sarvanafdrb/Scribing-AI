// "use client";

// import { useState } from "react";
// import { Calendar } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
// } from "@/components/ui/select";
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/components/ui/popover";
// import {
//   DATE_FILTER_PRESET_LABELS,
//   DateFilterPreset,
//   DateFilterValue,
//   formatDateRangeLabel,
// } from "@/utils/date.utils";
// import { cn } from "@/lib/utils";

// interface DateFilterProps {
//   value: DateFilterValue;
//   onChange: (value: DateFilterValue) => void;
//   presets: DateFilterPreset[];
//   className?: string;
// }

// export function DateFilter({
//   value,
//   onChange,
//   presets,
//   className,
// }: DateFilterProps) {
//   const [customOpen, setCustomOpen] = useState(false);
//   const [draftFrom, setDraftFrom] = useState(value.customFrom || "");
//   const [draftTo, setDraftTo] = useState(value.customTo || "");

//   const handlePresetChange = (preset: DateFilterPreset) => {
//     if (preset === "custom") {
//       setDraftFrom(value.customFrom || "");
//       setDraftTo(value.customTo || "");
//       setCustomOpen(true);
//       onChange({ ...value, preset: "custom" });
//       return;
//     }

//     onChange({
//       preset,
//       customFrom: undefined,
//       customTo: undefined,
//     });
//   };

//   const applyCustomRange = () => {
//     onChange({
//       preset: "custom",
//       customFrom: draftFrom || undefined,
//       customTo: draftTo || undefined,
//     });
//     setCustomOpen(false);
//   };

//   return (
//     <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center", className)}>
//       <Select value={value.preset} onValueChange={handlePresetChange}>
//         <SelectTrigger className="w-full sm:w-[200px]">
//           <div className="flex items-center gap-2">
//             <Calendar className="h-4 w-4 text-muted-foreground" />
//             <span className="truncate">{formatDateRangeLabel(value)}</span>
//           </div>
//         </SelectTrigger>
//         <SelectContent>
//           {presets.map((preset) => (
//             <SelectItem key={preset} value={preset}>
//               {DATE_FILTER_PRESET_LABELS[preset]}
//             </SelectItem>
//           ))}
//         </SelectContent>
//       </Select>

//       {value.preset === "custom" && (
//         <Popover open={customOpen} onOpenChange={setCustomOpen}>
//           <PopoverTrigger asChild>
//             <Button variant="outline" size="sm" className="w-full sm:w-auto">
//               Edit range
//             </Button>
//           </PopoverTrigger>
//           <PopoverContent className="w-72 p-4" align="start">
//             <div className="space-y-3">
//               <p className="text-sm font-medium">Custom date range</p>
//               <div className="space-y-2">
//                 <label className="text-xs text-muted-foreground">From</label>
//                 <Input
//                   type="date"
//                   value={draftFrom}
//                   onChange={(e) => setDraftFrom(e.target.value)}
//                 />
//               </div>
//               <div className="space-y-2">
//                 <label className="text-xs text-muted-foreground">To</label>
//                 <Input
//                   type="date"
//                   value={draftTo}
//                   min={draftFrom || undefined}
//                   onChange={(e) => setDraftTo(e.target.value)}
//                 />
//               </div>
//               <Button
//                 size="sm"
//                 className="w-full"
//                 onClick={applyCustomRange}
//                 disabled={!draftFrom && !draftTo}
//               >
//                 Apply
//               </Button>
//             </div>
//           </PopoverContent>
//         </Popover>
//       )}
//     </div>
//   );
// }
