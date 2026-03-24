import cs from "@/styles/components.module.css";

export function Loader() {
  return (
    <div className={cs.loader}>
      <div className={cs.spinner} />
    </div>
  );
}
