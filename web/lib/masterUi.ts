import type { MasterCategory } from "./masters";

export const MASTER_CATEGORY_UI: Record<
  MasterCategory,
  {
    title: string;
    singular: string;
    addButton: string;
    addDialogTitle: string;
    editDialogTitle: string;
    fieldLabel: string;
    fieldPlaceholder: string;
  }
> = {
  bd: {
    title: "BD Info",
    singular: "BD",
    addButton: "Add BD",
    addDialogTitle: "Add BD",
    editDialogTitle: "Edit BD",
    fieldLabel: "BD Name",
    fieldPlaceholder: "Enter BD name",
  },
  bd_level: {
    title: "BD Levels",
    singular: "BD Level",
    addButton: "Add BD Level",
    addDialogTitle: "Add BD Level",
    editDialogTitle: "Edit BD Level",
    fieldLabel: "BD Level Name",
    fieldPlaceholder: "Enter BD level name",
  },
  customer_type: {
    title: "Customer Types",
    singular: "Customer Type",
    addButton: "Add Customer Type",
    addDialogTitle: "Add Customer Type",
    editDialogTitle: "Edit Customer Type",
    fieldLabel: "Customer Type Name",
    fieldPlaceholder: "Enter customer type name",
  },
  point_type: {
    title: "Point Types",
    singular: "Point Type",
    addButton: "Add Point Type",
    addDialogTitle: "Add Point Type",
    editDialogTitle: "Edit Point Type",
    fieldLabel: "Point Type Name",
    fieldPlaceholder: "Enter point type name",
  },
};