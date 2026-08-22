import { CustomersWorkspace } from "./CustomersWorkspace";
import { ReturnsWorkspace } from "./ReturnsWorkspace";
import { ReviewsWorkspace } from "./ReviewsWorkspace";
import { SupportWorkspace } from "./SupportWorkspace";

export type CustomerOperationsTab =
  "Customers" | "Returns" | "Reviews" | "Support";

export function AdminCustomerOperations({
  module,
}: {
  module: CustomerOperationsTab;
}) {
  if (module === "Customers") return <CustomersWorkspace />;
  if (module === "Returns") return <ReturnsWorkspace />;
  if (module === "Reviews") return <ReviewsWorkspace />;
  return <SupportWorkspace />;
}
