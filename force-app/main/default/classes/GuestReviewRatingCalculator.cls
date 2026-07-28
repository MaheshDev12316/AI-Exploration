public with sharing class GuestReviewRatingCalculator {
    /**
     * Invokes the Guest Reviews evaluator prompt template for a single
     * Experience record, deserializes the generated response and updates the
     * Experience record with the evaluated Value, Accuracy and Communication
     * ratings.
     *
     * @param recordId the Id of the Experience__c record to evaluate
     */
    public static void generateRatingParams(Id recordId) {

        // ---------------------------------------------------------------
        // Input parameters
        // ---------------------------------------------------------------
        Map<String, ConnectApi.WrappedValue> inputParams =
            new Map<String, ConnectApi.WrappedValue>();

        // Prompt template input: pass the Experience record that the prompt
        // template expects as its input variable. The template resolves the
        // record's related data (guest review text, etc.) from this Id.
        ConnectApi.WrappedValue experienceWrappedValue = new ConnectApi.WrappedValue();
        Map<String, Object> experienceRecord = new Map<String, Object>{
            'id' => recordId
        };
        experienceWrappedValue.value = experienceRecord;
        inputParams.put('Input:Experience', experienceWrappedValue);

        // ---------------------------------------------------------------
        // Invocation parameters
        // ---------------------------------------------------------------
        ConnectApi.EinsteinPromptTemplateGenerationsInput promptGenerationsInput =
            new ConnectApi.EinsteinPromptTemplateGenerationsInput();
        promptGenerationsInput.additionalConfig =
            new ConnectApi.EinsteinLlmAdditionalConfigInput();
        promptGenerationsInput.additionalConfig.applicationName =
            'PromptTemplateGenerationsInvocable';
        promptGenerationsInput.isPreview = false;
        promptGenerationsInput.inputParams = inputParams;

        // Generate the response by invoking the prompt template with both the
        // prompt template API name and the input parameters configured above.
        ConnectApi.EinsteinPromptTemplateGenerationsRepresentation generationsOutputCopy =
            ConnectApi.EinsteinLLM.generateMessagesForPromptTemplateCopy(
                'Experience_Guest_Reviews_EvaluatorCopy',
                promptGenerationsInput
            );

        // Set the response from the generationsCopy property.
        ConnectApi.EinsteinLLMGenerationItemOutput response =
            generationsOutputCopy.generationsCopy[0];

        // ---------------------------------------------------------------
        // Deserialize the response and update the Experience record with the
        // evaluated ratings.
        // ---------------------------------------------------------------
        GuestReviewRating rating =
            (GuestReviewRating) JSON.deserialize(
                response.text,
                GuestReviewRating.class
            );

        Experience__c experience = new Experience__c(
            Id = recordId,
            Value__c = rating.value,
            Accuracy__c = rating.accuracy,
            Communication__c = rating.communication
        );
        update experience;
    }

    /**
     * Simple wrapper used to deserialize the JSON rating payload returned by
     * the prompt template.
     */
    public class GuestReviewRating {
        public Decimal value;
        public Decimal accuracy;
        public Decimal communication;
    }
}
