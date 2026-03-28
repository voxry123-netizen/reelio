"use client";

export default function Tabs({
  value, onChange, items
}:{
  value:string; onChange:(v:string)=>void;
  items:{value:string; label:string}[];
}) {
  return (
    <div className="rm-tabs">
      {items.map(i=>(
        <button
          key={i.value}
          className={`rm-tab ${value===i.value ? "is-active":""}`}
          onClick={()=>onChange(i.value)}
          type="button"
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}