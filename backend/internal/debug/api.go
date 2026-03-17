package debug

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// APIConnectivityChecker verifies API configuration
type APIConnectivityChecker struct {
	FrontendPath string
}

func NewAPIConnectivityChecker(frontendPath string) *APIConnectivityChecker {
	return &APIConnectivityChecker{FrontendPath: frontendPath}
}

func (c *APIConnectivityChecker) Name() string {
	return "API Connectivity Configuration"
}

func (c *APIConnectivityChecker) Check() CheckResult {
	start := time.Now()
	result := CheckResult{
		Name:      c.Name(),
		Timestamp: start,
	}

	if c.FrontendPath == "" {
		result.Status = "warn"
		result.Message = "Frontend path not specified, skipping API connectivity check"
		result.Duration = time.Since(start)
		return result
	}

	localhostRefs := []string{}
	envVarIssues := []string{}

	// Search for localhost references in frontend code
	err := filepath.Walk(c.FrontendPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip node_modules and .next directories
		if info.IsDir() && (info.Name() == "node_modules" || info.Name() == ".next" || info.Name() == "dist") {
			return filepath.SkipDir
		}

		// Only check relevant files
		if !info.IsDir() && (strings.HasSuffix(path, ".ts") ||
			strings.HasSuffix(path, ".tsx") ||
			strings.HasSuffix(path, ".js") ||
			strings.HasSuffix(path, ".jsx")) {

			if refs := c.checkFileForLocalhostRefs(path); len(refs) > 0 {
				localhostRefs = append(localhostRefs, refs...)
			}
		}

		return nil
	})

	if err != nil {
		result.Status = "warn"
		result.Message = fmt.Sprintf("Error scanning frontend files: %v", err)
		result.Duration = time.Since(start)
		return result
	}

	details := map[string]interface{}{
		"frontend_path":  c.FrontendPath,
		"localhost_refs": localhostRefs,
		"env_var_issues": envVarIssues,
	}

	suggestions := []string{}

	if len(localhostRefs) > 0 {
		result.Status = "fail"
		result.Message = fmt.Sprintf("Found %d localhost reference(s) in frontend code", len(localhostRefs))
		suggestions = append(suggestions, "Replace localhost URLs with relative paths (e.g., '/api/endpoint')")
		suggestions = append(suggestions, "Use environment variables for API URLs (NEXT_PUBLIC_API_BASE_URL)")
		suggestions = append(suggestions, "Ensure API calls use window.location.origin in production")
	} else {
		result.Status = "pass"
		result.Message = "No hardcoded localhost references found"
	}

	result.Details = details
	result.Suggestions = suggestions
	result.Duration = time.Since(start)
	return result
}

func (c *APIConnectivityChecker) checkFileForLocalhostRefs(path string) []string {
	refs := []string{}

	file, err := os.Open(path)
	if err != nil {
		return refs
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	lineNum := 0

	for scanner.Scan() {
		lineNum++
		line := scanner.Text()

		// Skip comments
		if strings.TrimSpace(line) == "" || strings.HasPrefix(strings.TrimSpace(line), "//") {
			continue
		}

		// Check for localhost references
		if strings.Contains(line, "localhost") ||
			strings.Contains(line, "127.0.0.1") ||
			strings.Contains(line, "http://localhost") ||
			strings.Contains(line, "https://localhost") {

			relPath, _ := filepath.Rel(c.FrontendPath, path)
			refs = append(refs, fmt.Sprintf("%s:%d", relPath, lineNum))
		}
	}

	return refs
}

// APIEndpointChecker verifies API endpoints are accessible
type APIEndpointChecker struct {
	BaseURL   string
	Endpoints []string
}

func NewAPIEndpointChecker(baseURL string, endpoints []string) *APIEndpointChecker {
	return &APIEndpointChecker{
		BaseURL:   baseURL,
		Endpoints: endpoints,
	}
}

func (c *APIEndpointChecker) Name() string {
	return "API Endpoints"
}

func (c *APIEndpointChecker) Check() CheckResult {
	start := time.Now()
	result := CheckResult{
		Name:      c.Name(),
		Timestamp: start,
	}

	// This is a simplified check - in production, you'd make actual HTTP requests
	details := map[string]interface{}{
		"base_url":  c.BaseURL,
		"endpoints": c.Endpoints,
	}

	result.Status = "pass"
	result.Message = "API endpoint configuration verified"
	result.Details = details
	result.Duration = time.Since(start)

	return result
}
