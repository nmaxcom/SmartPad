import React, { useState } from "react";
import { SYNTAX_REGISTRY, getSyntaxByCategory, searchSyntax, SyntaxPattern } from "../syntax/registry";

/**
 * SyntaxExplorer Component
 * 
 * A developer tool that displays all available syntax patterns in SmartPad.
 * This serves as a quick reference for developers and can be used during development.
 */
export function SyntaxExplorer() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const categories = ["all", ...getSyntaxByCategory("percentages").map(() => "percentages"), ...getSyntaxByCategory("variables").map(() => "variables"), ...getSyntaxByCategory("units").map(() => "units"), ...getSyntaxByCategory("currency").map(() => "currency")].filter((v, i, a) => a.indexOf(v) === i);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getFilteredSyntax = (): SyntaxPattern[] => {
    let filtered = SYNTAX_REGISTRY;
    
    if (selectedCategory !== "all") {
      filtered = filtered.filter(pattern => pattern.category === selectedCategory);
    }
    
    if (searchTerm) {
      filtered = searchSyntax(searchTerm);
    }
    
    return filtered;
  };

  const filteredSyntax = getFilteredSyntax();

  return (
    <div className="syntax-explorer" style={{ padding: "20px", fontFamily: "monospace" }}>
      <h2>SmartPad Syntax Reference</h2>
      
      {/* Search and Filter Controls */}
      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search syntax patterns..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ 
            padding: "8px", 
            marginRight: "10px", 
            width: "300px",
            border: "1px solid #ccc",
            borderRadius: "4px"
          }}
        />
        
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{ 
            padding: "8px", 
            border: "1px solid #ccc", 
            borderRadius: "4px" 
          }}
        >
          <option value="all">All Categories</option>
          {categories.filter(cat => cat !== "all").map(category => (
            <option key={category} value={category}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Results Count */}
      <div style={{ marginBottom: "20px", color: "#666" }}>
        Showing {filteredSyntax.length} syntax patterns
        {selectedCategory !== "all" && ` in ${selectedCategory}`}
        {searchTerm && ` matching "${searchTerm}"`}
      </div>

      {/* Syntax Patterns */}
      <div>
        {filteredSyntax.map((pattern, index) => (
          <div 
            key={index} 
            style={{ 
              border: "1px solid #ddd", 
              borderRadius: "8px", 
              padding: "15px", 
              marginBottom: "15px",
              backgroundColor: "#f9f9f9"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h3 style={{ margin: 0, color: "#333" }}>{pattern.syntax}</h3>
              <span style={{ 
                backgroundColor: "#007bff", 
                color: "white", 
                padding: "4px 8px", 
                borderRadius: "12px", 
                fontSize: "12px",
                textTransform: "uppercase"
              }}>
                {pattern.category}
              </span>
            </div>
            
            <p style={{ margin: "8px 0", color: "#555" }}>{pattern.description}</p>
            
            <div style={{ margin: "8px 0" }}>
              <strong>Output:</strong> {pattern.output}
            </div>
            
            {pattern.examples && pattern.examples.length > 0 && (
              <div style={{ margin: "8px 0" }}>
                <strong>Examples:</strong>
                <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
                  {pattern.examples.map((example, i) => (
                    <li key={i} style={{ fontFamily: "monospace", color: "#007bff" }}>
                      {example}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Reference Summary */}
      <div style={{ marginTop: "30px", padding: "20px", backgroundColor: "#f0f8ff", borderRadius: "8px" }}>
        <h3>Quick Reference</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px" }}>
          {categories.filter(cat => cat !== "all").map(category => {
            const categoryPatterns = getSyntaxByCategory(category);
            return (
              <div key={category} style={{ border: "1px solid #ddd", borderRadius: "6px", padding: "15px", backgroundColor: "white" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#333" }}>
                  {category.charAt(0).toUpperCase() + category.slice(1)} ({categoryPatterns.length})
                </h4>
                <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "14px" }}>
                  {categoryPatterns.slice(0, 3).map((pattern, i) => (
                    <li key={i} style={{ marginBottom: "5px" }}>
                      <code style={{ backgroundColor: "#f5f5f5", padding: "2px 4px", borderRadius: "3px" }}>
                        {pattern.syntax}
                      </code>
                    </li>
                  ))}
                  {categoryPatterns.length > 3 && (
                    <li style={{ color: "#666", fontStyle: "italic" }}>
                      ... and {categoryPatterns.length - 3} more
                    </li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default SyntaxExplorer;
