import os
import glob
import re

components_dir = "src/components"
test_template = """import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { {component_name} } from "./{component_name}";

// Generic mock for any Next.js router usage
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() })
}));

// Generic mock for next/link
vi.mock("next/link", () => ({
  default: ({ children }: any) => <div>{children}</div>
}));

// Generic mock for framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

// Generic mocks for common hooks used in this project
vi.mock("@/hooks/useAgentState", () => ({
  useAgentState: () => null
}));

vi.mock("@/hooks/useActiveCycle", () => ({
  useActiveCycle: () => ({ cycle: null, isSabotaged: false, saboteur: null })
}));

vi.mock("@/hooks/useCounterTrades", () => ({
  useCounterTrades: () => ({ trades: [], totalPool: 0, againstPool: 0 })
}));

vi.mock("@/hooks/useSabotageEvents", () => ({
  useSabotageEvents: () => []
}));

vi.mock("@/hooks/useWallet", () => ({
  useWallet: () => ({ address: null, isConnected: false, chainId: null, connect: vi.fn(), disconnect: vi.fn() })
}));

vi.mock("@/hooks/useCoTStream", () => ({
  useCoTStream: () => ({ thoughts: [], isThinking: false })
}));

vi.mock("@/hooks/useSelfCorrections", () => ({
  useSelfCorrections: () => []
}));

describe("{component_name}", () => {
  it("renders without crashing", () => {
    const { container } = render(<{component_name} {props} />);
    expect(container).toBeTruthy();
  });
});
"""

def extract_props(content, component_name):
    # Very basic prop extraction to satisfy TS
    props_str = ""
    # find interface Props { ... } or type Props = ...
    # just look for things like agentId, etc in the component signature
    # Since we can't perfectly parse TS, we'll try to provide dummy defaults if we know them
    
    if "agentId=" in content or "agentId:" in content:
        props_str += 'agentId="agent-123" '
    
    if "cycleId=" in content or "cycleId:" in content:
        props_str += 'cycleId="cycle-123" '
        
    if "trade=" in content or "trade:" in content:
        props_str += 'trade={{ id: "trade-1", type: "BUY", amount: "100" } as any} '
        
    if "isOpen=" in content or "isOpen:" in content:
        props_str += 'isOpen={true} '
        
    if "onClose=" in content or "onClose:" in content:
        props_str += 'onClose={vi.fn()} '
        
    return props_str.strip()

tsx_files = glob.glob(f"{components_dir}/*.tsx")
for f in tsx_files:
    if "test.tsx" in f:
        continue
    
    basename = os.path.basename(f)
    component_name = basename.replace(".tsx", "")
    
    test_file = os.path.join(components_dir, f"{component_name}.test.tsx")
    
    # Don't overwrite existing tests
    if os.path.exists(test_file):
        continue
        
    with open(f, 'r') as infile:
        content = infile.read()
        
    # Check if it has default export or named export
    if f"export default function {component_name}" in content or f"export default {component_name}" in content:
        template = test_template.replace("import { {component_name} }", "import {component_name}")
    else:
        template = test_template
        
    props = extract_props(content, component_name)
    
    test_content = template.replace("{component_name}", component_name).replace("{props}", props)
    
    with open(test_file, 'w') as outfile:
        outfile.write(test_content)
        
print("Generated smoke tests for components.")
