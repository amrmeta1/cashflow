package bank_parser

import (
	"regexp"
	"strconv"
	"strings"
)

// parseAllNumbers extracts all numbers from a string
func parseAllNumbers(s string) []float64 {
	// Remove commas and split by whitespace
	s = strings.ReplaceAll(s, ",", "")
	
	// Regex to find all numbers (including decimals)
	numberPattern := regexp.MustCompile(`\d+\.?\d*`)
	matches := numberPattern.FindAllString(s, -1)
	
	var numbers []float64
	for _, match := range matches {
		if num, err := strconv.ParseFloat(match, 64); err == nil {
			numbers = append(numbers, num)
		}
	}
	
	return numbers
}
