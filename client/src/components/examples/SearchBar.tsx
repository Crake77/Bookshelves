import { useState } from "react";
import SearchBar from "../SearchBar";

export default function SearchBarExample() {
  const [search, setSearch] = useState("");

  return (
    <div className="p-4 max-w-md">
      <SearchBar
        value={search}
        onChange={setSearch}
        onFilterClick={() => console.log("Filter clicked")}
      />
    </div>
  );
}
