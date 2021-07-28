import {
    TeamsActivityHandler,
    CardFactory,
    TurnContext,
    SigninStateVerificationQuery,
    ActionTypes,
    BotState,
    MessageFactory,
    Mention,
} from "botbuilder";
import { MainDialog } from "./dialogs/mainDialog";
import BurritoStore from "../src/store/BurritoStore";

export class TeamsBot extends TeamsActivityHandler {
    conversationState: BotState;
    userState: BotState;
    dialog: MainDialog;
    dialogState: any;

    /**
     * @param {ConversationState} conversationState
     * @param {UserState} userState
     * @param {Dialog} dialog
     */
    constructor(
        conversationState: BotState,
        userState: BotState,
        dialog: MainDialog
    ) {
        super();
        if (!conversationState) {
            throw new Error(
                "[TeamsBot]: Missing parameter. conversationState is required"
            );
        }
        if (!userState) {
            throw new Error(
                "[TeamsBot]: Missing parameter. userState is required"
            );
        }
        if (!dialog) {
            throw new Error(
                "[TeamsBot]: Missing parameter. dialog is required"
            );
        }
        this.conversationState = conversationState;
        this.userState = userState;
        this.dialog = dialog;
        this.dialogState = this.conversationState.createProperty("DialogState");

        this.onMessage(async (context, next) => {
            console.log("Running dialog with Message Activity.");

            const atMentionRegex = /<\s*at[^>]*>(.*?)<\s*\/\s*at>\s/g;
            const match = context.activity.text.match(atMentionRegex);
            if (match.length == 2) {
                const to = context.activity.entities?.find(
                    (e) =>
                        e.type == "mention" &&
                        e.mentioned.id !== context.activity.recipient.id
                )?.mentioned;
                const from = context.activity.from;
                if (to && from) {
                    if (context.activity.text.toLowerCase().includes("score")) {
                        const score = await BurritoStore.getUserScore(to, 'to', 'inc');
                        const toMention = {
                          mentioned: to,
                          text: `<at>${new TextEncoder().encode(to.name)}</at>`,
                          type: 'mention'
                        } as Mention;
                        const replyActivity = MessageFactory.text(`${toMention.text}: ${score} 🍩s`);
                        replyActivity.entities = [toMention];
                        context.sendActivity(replyActivity);

                    } else {
                        await BurritoStore.giveBurrito(to, from);
                        const toMention = {
                          mentioned: to,
                          text: `<at>${new TextEncoder().encode(to.name)}</at>`,
                          type: 'mention'
                        } as Mention;
                        const fromMention = {
                          mentioned: from,
                          text: `<at>${new TextEncoder().encode(from.name)}</at>`,
                          type: 'mention'
                        } as Mention;
                        const replyActivity = MessageFactory.text(`${fromMention.text} gave ${toMention.text} a 🍩. Congratulations!`);
                        replyActivity.entities = [fromMention, toMention];
                        context.sendActivity(replyActivity);
                    }
                }
            }

            // Run the Dialog with the new message Activity.
            // await this.dialog.run(context, this.dialogState);

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            for (let cnt = 0; cnt < membersAdded.length; cnt++) {
                if (membersAdded[cnt].id) {
                    const cardButtons = [
                        {
                            type: ActionTypes.ImBack,
                            title: "Show introduction card",
                            value: "intro",
                        },
                    ];
                    const card = CardFactory.heroCard(
                        "Welcome",
                        null,
                        cardButtons,
                        {
                            text: `Congratulations! Your hello world Bot template is running. This bot has default commands to help you modify it. <br>You can reply <strong>intro</strong> to see the introduction card. This bot is built with <a href=\"https://dev.botframework.com/\">Microsoft Bot Framework</a>`,
                        }
                    );
                    await context.sendActivity({ attachments: [card] });
                    break;
                }
            }
            await next();
        });
    }

    async run(context: TurnContext) {
        await super.run(context);

        // Save any state changes. The load happened during the execution of the Dialog.
        await this.conversationState.saveChanges(context, false);
        await this.userState.saveChanges(context, false);
    }

    async handleTeamsSigninVerifyState(
        context: TurnContext,
        query: SigninStateVerificationQuery
    ) {
        console.log(
            "Running dialog with signin/verifystate from an Invoke Activity."
        );
        await this.dialog.run(context, this.dialogState);
    }

    async handleTeamsSigninTokenExchange(
        context: TurnContext,
        query: SigninStateVerificationQuery
    ) {
        await this.dialog.run(context, this.dialogState);
    }

    async onSignInInvoke(context: TurnContext) {
        await this.dialog.run(context, this.dialogState);
    }
}
